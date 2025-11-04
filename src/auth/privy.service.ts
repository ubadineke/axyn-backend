import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/node';

export interface PrivyVerifiedClaims {
  appId: string;
  userId: string;
  issuer: string;
  issuedAt: number;
  expiration: number;
  sessionId: string;
}

export interface PrivyUserData {
  id: string;
  email?: { address: string };
  wallet?: { address: string };
  linkedAccounts: Array<{
    type: string;
    address?: string;
    email?: string;
  }>;
}

@Injectable()
export class PrivyService {
  private privyClient: PrivyClient;

  constructor(private configService: ConfigService) {
    this.privyClient = new PrivyClient({
      appId: this.configService.get<string>('PRIVY_APP_ID') as string,
      appSecret: this.configService.get<string>('PRIVY_APP_SECRET') as string,
    });
  }

  /**
   * Verify the Privy auth token and return user claims
   */
  async verifyAuthToken(token: string): Promise<PrivyVerifiedClaims> {
    if (!token) {
      throw new UnauthorizedException('Auth token is missing');
    }

    try {
      const verifiedClaims = await this.privyClient
        .utils()
        .auth()
        .verifyAuthToken(token);

      if (!verifiedClaims) {
        throw new UnauthorizedException('Failed to verify auth token');
      }

      // Map the response to our interface
      return {
        appId: verifiedClaims.app_id,
        userId: verifiedClaims.user_id,
        issuer: verifiedClaims.issuer,
        issuedAt: verifiedClaims.issued_at,
        expiration: verifiedClaims.expiration,
        sessionId: verifiedClaims.session_id,
      };
    } catch (error) {
      throw new UnauthorizedException(
        `Invalid auth token: ${error.message}`,
      );
    }
  }

  /**
   * Get user details from Privy using userId (DID)
   */
  async getUserFromPrivy(userId: string): Promise<any> {
    try {
      // @ts-expect-error Privy SDK types may not match perfectly
      const user = await this.privyClient.users().get({ did: userId });
      return user;
    } catch (error) {
      throw new Error(`Failed to get user from Privy: ${error.message}`);
    }
  }
}
