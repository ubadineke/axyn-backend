import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrivyService } from './privy.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly privyService: PrivyService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) { }

  /**
   * Login endpoint - verifies Privy token and returns JWT
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    console.log('🔐 [AUTH] Login request received');
    console.log('📝 [AUTH] Privy token length:', loginDto.authToken.length);

    // 1. Verify the Privy auth token (contains all user data)
    const verifiedClaims = await this.privyService.verifyAuthToken(
      loginDto.authToken,
    );

    // Extract userId from claims (could be userId, user_id, or sub)
    const userId = verifiedClaims.userId || verifiedClaims.user_id || verifiedClaims.sub;
    console.log('✅ [AUTH] Privy token verified for user:', userId);
    console.log('📋 [AUTH] Available claim fields:', Object.keys(verifiedClaims));

    // 2. Extract linked accounts from token claims
    // The verified token should contain linked_accounts or similar data
    let linkedAccounts = this.extractLinkedAccounts(verifiedClaims);

    if (!Array.isArray(linkedAccounts) || linkedAccounts.length === 0) {
      console.warn('⚠️  [AUTH] No linked accounts present in token claims. Fetching from Privy API...');
      const privyUser = await this.privyService.getUserFromPrivy(userId);
      linkedAccounts = this.extractLinkedAccounts(privyUser);
    }

    if (!Array.isArray(linkedAccounts) || linkedAccounts.length === 0) {
      console.error('❌ [AUTH] Unable to retrieve linked accounts for user:', userId);
      throw new UnauthorizedException(
        'Unable to retrieve linked accounts from Privy. Please try signing in again.',
      );
    }

    // 3. Extract wallet address (embedded Solana wallet)
    let solanaWallet = linkedAccounts.find(
      (account: any) =>
        account.type === 'wallet' &&
        (account.chain_type === 'solana' || account.chainType === 'solana'),
    );

    if (!solanaWallet?.address && loginDto.walletAddress) {
      console.warn('⚠️  [AUTH] No Solana wallet in token claims; using wallet from client payload');
      solanaWallet = {
        address: loginDto.walletAddress,
        type: 'wallet',
        chain_type: 'solana',
      };
    }

    if (!solanaWallet?.address) {
      console.error('❌ [AUTH] No Solana wallet found in linked accounts or payload:', linkedAccounts);
      throw new UnauthorizedException(
        'No Solana wallet found for this user. Please ensure you have a Solana wallet linked to your account.',
      );
    }

    console.log('💰 [AUTH] Found Solana wallet:', solanaWallet.address);

    // 4. Extract identity information from linked accounts
    const identityData = this.extractIdentityData(linkedAccounts);
    console.log('🔍 [AUTH] Extracted identity data:', {
      loginMethod: identityData.loginMethod,
      hasEmail: !!identityData.email,
      hasPhone: !!identityData.phoneNumber,
      hasTwitter: !!identityData.twitterUsername,
      hasDiscord: !!identityData.discordUsername,
    });

    // 5. Check if user exists in database
    let user = await this.userService.findByPrivyUserId(userId);

    // 6. Create user if they don't exist
    if (!user) {
      console.log('➕ [AUTH] Creating new user in database');

      // Derive a display name from available identity data
      const displayName = identityData.name ||
        identityData.twitterUsername ||
        identityData.email?.split('@')[0] ||
        identityData.phoneNumber ||
        `User${solanaWallet.address.slice(0, 6)}`;

      user = await this.userService.create({
        privyUserId: userId,
        walletAddress: solanaWallet.address,
        email: identityData.email,
        name: displayName,
        loginMethod: identityData.loginMethod,
        phoneNumber: identityData.phoneNumber,
        twitterUsername: identityData.twitterUsername,
        discordUsername: identityData.discordUsername,
        googleEmail: identityData.googleEmail,
      });
      console.log('✅ [AUTH] New user created with ID:', user.id);
    } else {
      console.log('👍 [AUTH] Existing user found with ID:', user.id);

      // Update login method and identity data if changed (user might link new accounts)
      await this.userService.update(user.id, {
        loginMethod: identityData.loginMethod,
        phoneNumber: identityData.phoneNumber,
        twitterUsername: identityData.twitterUsername,
        discordUsername: identityData.discordUsername,
        googleEmail: identityData.googleEmail,
        email: identityData.email || user.email, // Keep existing email if new login doesn't have one
      });
    }

    // 6. Generate JWT token
    const payload = {
      sub: user.id,
      privyUserId: user.privyUserId,
      walletAddress: user.walletAddress,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    console.log('🎟️  [AUTH] JWT token generated (expires in 30 days)');

    // 7. Return response
    console.log('✨ [AUTH] Login successful! Returning JWT and user data');
    console.log('📊 [AUTH] User:', { id: user.id, wallet: user.walletAddress.slice(0, 8) + '...' });

    return {
      accessToken,
      user,  // Return the complete user entity with all fields
    };
  }

  /**
   * Validate JWT token and return user payload
   */
  async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Extract identity data from Privy linked accounts
   * Supports: Google, Twitter, Discord, Email, Phone
   */
  private extractIdentityData(linkedAccounts: any[]): {
    loginMethod?: string;
    email?: string;
    phoneNumber?: string;
    twitterUsername?: string;
    discordUsername?: string;
    googleEmail?: string;
    name?: string;
  } {
    const result: any = {};

    for (const account of linkedAccounts) {
      const accountType = account.type?.toLowerCase();

      switch (accountType) {
        case 'google_oauth':
          result.loginMethod = result.loginMethod || 'google';
          result.googleEmail = account.email || account.address;
          result.email = result.email || result.googleEmail;
          result.name = result.name || account.name;
          break;

        case 'twitter_oauth':
          result.loginMethod = result.loginMethod || 'twitter';
          result.twitterUsername = account.username || account.subject;
          result.name = result.name || account.name;
          break;

        case 'discord_oauth':
          result.loginMethod = result.loginMethod || 'discord';
          result.discordUsername = account.username || account.subject;
          result.email = result.email || account.email;
          break;

        case 'email':
          result.loginMethod = result.loginMethod || 'email';
          result.email = result.email || account.address;
          break;

        case 'phone':
          result.loginMethod = result.loginMethod || 'phone';
          result.phoneNumber = account.number || account.phoneNumber;
          break;
      }
    }

    return result;
  }

  private extractLinkedAccounts(source: any): any[] {
    if (!source) {
      return [];
    }

    if (Array.isArray(source.linked_accounts)) {
      return source.linked_accounts;
    }

    if (Array.isArray(source.linkedAccounts)) {
      return source.linkedAccounts;
    }

    if (Array.isArray(source.user?.linked_accounts)) {
      return source.user.linked_accounts;
    }

    if (Array.isArray(source.user?.linkedAccounts)) {
      return source.user.linkedAccounts;
    }

    return [];
  }
}
