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
  ) {}

  /**
   * Login endpoint - verifies Privy token and returns JWT
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    console.log('🔐 [AUTH] Login request received');
    console.log('📝 [AUTH] Privy token length:', loginDto.authToken.length);

    // 1. Verify the Privy auth token
    const verifiedClaims = await this.privyService.verifyAuthToken(
      loginDto.authToken,
    );
    console.log('✅ [AUTH] Privy token verified for user:', verifiedClaims.userId);

    // 2. Get user details from Privy
    const privyUser = await this.privyService.getUserFromPrivy(
      verifiedClaims.userId,
    );
    console.log('👤 [AUTH] Retrieved user from Privy:', privyUser.id);

    // 3. Extract wallet address (embedded Solana wallet)
    const solanaWallet = privyUser.linked_accounts?.find(
      (account: any) =>
        account.type === 'wallet' && account.chain_type === 'solana',
    );

    if (!solanaWallet?.address) {
      throw new UnauthorizedException(
        'No Solana wallet found for this user',
      );
    }

    // 4. Check if user exists in database
    let user = await this.userService.findByPrivyUserId(verifiedClaims.userId);

    // 5. Create user if they don't exist
    if (!user) {
      console.log('➕ [AUTH] Creating new user in database');
      user = await this.userService.create({
        privyUserId: verifiedClaims.userId,
        walletAddress: solanaWallet.address,
        email: privyUser.email?.address,
        name: privyUser.email?.address?.split('@')[0], // Use email prefix as name
      });
      console.log('✅ [AUTH] New user created with ID:', user.id);
    } else {
      console.log('👍 [AUTH] Existing user found with ID:', user.id);
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
      user: {
        id: user.id,
        privyUserId: user.privyUserId,
        walletAddress: user.walletAddress,
        email: user.email,
        name: user.name,
      },
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
}
