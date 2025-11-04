import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/node';
import Request from 'express';

// interface RequestWithCookies extends Request {
//   cookies: {
//     [key: string]: string;
//   };
// }

@Injectable()
export class PrivyService {
  private privyClient: PrivyClient;

  constructor(private configService: ConfigService) {
    this.privyClient = new PrivyClient({
      appId: this.configService.get<string>('PRIVY_APP_ID') as string,
      appSecret: this.configService.get<string>('PRIVY_APP_SECRET') as string,
    });
  }

  async verifyAuthToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }
    try {
      const verifiedClaims = await this.privyClient
        .utils()
        .auth()
        .verifyAuthToken(token);
      if (!verifiedClaims) {
        throw new UnauthorizedException('Failed to verify token');
      }
    } catch (error) {
      throw new Error(`Failed to verify Privy token: ${error.message}`);
    }
  }

  // async getUserData(req: RequestWithCookies): Promise<any> {
  //   const idToken = req.cookies?.['privy-id-token']; // Retrieve token from cookies

  //   if (!idToken) {
  //     throw new UnauthorizedException('No Privy identity token found');
  //   }

  //   try {
  //     // Get user details from Privy
  //     return await this.privyClient.getUser({ idToken });
  //   } catch (error) {
  //     throw new Error(`Failed to get user from Privy: ${error.message}`);
  //   }
  // }
  // async getUserDataV2(userId: string) {
  //   try {
  //     return await this.privyClient.getUser(userId);
  //   } catch (error) {
  //     throw new Error(`Failed to get user from Privy 2: ${error.message}`);
  //   }
  // }
}
