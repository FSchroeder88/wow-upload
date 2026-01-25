import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

export type GithubUser = {
  githubId: string;
  username: string;
  avatarUrl?: string;
};

function parseAdminIds(): Set<string> {
  const raw = process.env.ADMIN_GITHUB_IDS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) { }

  private readonly adminIds = parseAdminIds();

  isAdminGithubId(githubId: string): boolean {
    return this.adminIds.has(String(githubId));
  }

  async getUserById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        githubId: true,
        username: true,
        avatarUrl: true,
        role: true,
      },
    });
  }


  async upsertGithubUser(gh: GithubUser) {
    const admins = parseAdminIds();
    const isAdmin = admins.has(gh.githubId);

    return this.prisma.user.upsert({
      where: { githubId: gh.githubId },
      update: {
        username: gh.username,
        avatarUrl: gh.avatarUrl ?? null,
        role: isAdmin ? 'ADMIN' : 'USER',
      },
      create: {
        githubId: gh.githubId,
        username: gh.username,
        avatarUrl: gh.avatarUrl ?? null,
        role: isAdmin ? 'ADMIN' : 'USER',
      },
      select: {
        id: true,
        githubId: true,
        username: true,
        avatarUrl: true,
        role: true,
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
