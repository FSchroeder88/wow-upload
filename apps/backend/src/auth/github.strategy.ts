import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';

export type GithubProfileUser = {
  githubId: string;
  username: string;
  avatarUrl?: string;
};

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/auth/github/callback',
      scope: ['read:user'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): GithubProfileUser {
    return {
      githubId: String(profile.id),
      username: profile.username ?? 'unknown',
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}
