import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import type { GithubProfileUser } from './github.strategy';

type RequestWithUser = Request & { user?: GithubProfileUser };

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
    // redirect handled by passport
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const ghUser = req.user;
    if (!ghUser) {
      res.status(401).send('Auth failed');
      return;
    }

    const user = await this.auth.upsertGithubUser(ghUser);
    const token = this.auth.signToken({ userId: user.id });

    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // lokal; später https => true
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.FRONTEND_URL || 'http://localhost:4200');
  }

  @Get('me')
  me(@Req() req: Request) {
    const token = readCookieToken(req);
    if (!token) return { authenticated: false };

    try {
      const payload = this.auth.verifyToken(token);
      return { authenticated: true, userId: payload.userId };
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
