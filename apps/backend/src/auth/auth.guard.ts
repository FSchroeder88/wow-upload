import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class DummyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const token = req.header('x-auth');

    if (token !== 'ok') {
      throw new UnauthorizedException('Login required');
    }

    return true;
  }
}
