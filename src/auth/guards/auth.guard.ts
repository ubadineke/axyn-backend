import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Log incoming request for debugging
    console.log('\n🔒 [AUTH GUARD] Checking authentication');
    console.log(`📍 [AUTH GUARD] ${request.method} ${request.url}`);
    console.log('📦 [AUTH GUARD] Request body keys:', Object.keys(request.body || {}));
    console.log('🔍 [AUTH GUARD] Query params:', JSON.stringify(request.query));
    console.log('🎫 [AUTH GUARD] Auth header:', request.headers?.authorization ? 'Present' : 'Missing');

    const token = this.extractToken(request);

    if (!token) {
      console.log('❌ [AUTH GUARD] No token found in body, query, or header');
      throw new UnauthorizedException('No token provided');
    }

    console.log('✅ [AUTH GUARD] Token found:', `${token.substring(0, 30)}...`);

    try {
      const payload = await this.jwtService.verifyAsync(token);
      console.log('✅ [AUTH GUARD] Token verified for user ID:', payload.sub);
      // Attach user payload to request object
      request['user'] = payload;
    } catch (error) {
      console.log('❌ [AUTH GUARD] Token verification failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const bodyToken = request.body?.token || request.body?.accessToken;
    if (bodyToken) {
      // Remove token fields from body to prevent DTO validation errors
      delete request.body.token;
      delete request.body.accessToken;
      return bodyToken;
    }

    const queryToken = (request.query as Record<string, unknown>)?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      // Remove token from query params
      delete (request.query as Record<string, unknown>).token;
      return queryToken;
    }

    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
