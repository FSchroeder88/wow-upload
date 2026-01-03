import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

export type GithubUser = {
  githubId: string;
  username: string;
  avatarUrl?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async upsertGithubUser(gh: GithubUser) {
    return this.prisma.user.upsert({
      where: { githubId: gh.githubId },
      update: {
        username: gh.username,
        avatarUrl: gh.avatarUrl ?? null,
      },
      create: {
        githubId: gh.githubId,
        username: gh.username,
        avatarUrl: gh.avatarUrl ?? null,
      },
      select: {
        id: true,
        githubId: true,
        username: true,
        avatarUrl: true,
      },
    });
  }

  signToken(payload: { userId: number }) {
    return this.jwt.sign(payload);
  }

  verifyToken(token: string): { userId: number } {
    return this.jwt.verify(token);
  }
}
