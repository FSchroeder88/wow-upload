import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  health() {
    return { ok: true, ts: new Date().toISOString() };
  }

  @Get('db-test')
  async dbTest() {
    return this.prisma.upload.findMany();
  }
}
