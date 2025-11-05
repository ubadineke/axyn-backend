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
   * Verify the Privy auth token and return user claims with full user data
   */
  async verifyAuthToken(token: string): Promise<any> {
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

      // The verified claims contain the full user object
      console.log('🔍 [PRIVY] Verified claims keys:', Object.keys(verifiedClaims));

      return verifiedClaims;
    } catch (error) {
      throw new UnauthorizedException(
        `Invalid auth token: ${error.message}`,
      );
    }
  }

  /**
   * Fetch the full Privy user record (including linked accounts) by user id
   */
  async getUserFromPrivy(userId: string): Promise<any | null> {
    if (!userId) {
      return null;
    }

    try {
      // The SDK exposes `_get` for retrieving a user by id.
      // `users()` returns an extended resource that inherits this method.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userResource: any = this.privyClient.users();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const user = await userResource._get(userId);
      return user;
    } catch (error) {
      console.warn(`⚠️  [PRIVY] Failed to fetch user ${userId} from Privy API: ${error}`);
      return null;
    }
  }
}
