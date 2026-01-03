import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

export type AuthedRequest = Request & { userId?: number };

function readCookieToken(req: Request): string | undefined {
  const cookies = req.cookies as unknown;
  if (!cookies || typeof cookies !== 'object') return undefined;

  const token = (cookies as Record<string, unknown>)['auth_token'];
  return typeof token === 'string' ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    const token = readCookieToken(req);
    if (!token) throw new UnauthorizedException('Login required');

    try {
      const payload = this.auth.verifyToken(token);
      req.userId = payload.userId;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
