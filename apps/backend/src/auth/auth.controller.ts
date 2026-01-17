import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

type DbUser = {
  id: number;
  githubId: string;
  username: string;
  avatarUrl: string | null;
};

type RequestWithUser = Request & { user?: DbUser };

function readCookieToken(req: Request): string | undefined {
  const cookies = req.cookies as unknown;
  if (!cookies || typeof cookies !== 'object') return undefined;

  const token = (cookies as Record<string, unknown>)['auth_token'];
  return typeof token === 'string' ? token : undefined;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin(): void {
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user; 
    if (!user) {
      res.status(401).send('Auth failed');
      return;
    }

    const token = this.auth.signToken({ userId: user.id });

    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, 
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.FRONTEND_URL || 'http://localhost:4200');
  }

  @Get('me')
  async me(@Req() req: Request) {
    const token = readCookieToken(req);
    if (!token) return { authenticated: false };

    try {
      const payload = this.auth.verifyToken(token);

      const user = await this.auth.getUserById(payload.userId);
      if (!user) return { authenticated: false };

      return {
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          githubId: user.githubId,
        },
      };
    } catch {
      return { authenticated: false };
    }
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('auth_token');
    res.json({ ok: true });
  }
}
