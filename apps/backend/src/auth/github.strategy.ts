import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from './auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private auth: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        'http://localhost:3000/auth/github/callback',
      scope: ['read:user'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    const githubId = String(profile.id);
    const username = profile.username ?? profile.displayName ?? 'unknown';

    const avatarUrl =
      profile.photos && profile.photos.length > 0
        ? profile.photos[0].value
        : undefined;

    const user = await this.auth.upsertGithubUser({
      githubId,
      username,
      avatarUrl,
    });

    return user; 
  }
}
