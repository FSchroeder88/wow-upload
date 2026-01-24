import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';

import { UploadsService, UploadListItem } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { getOptionalUserId } from '../auth/optional-auth.util';

@Controller('uploads')
export class UploadsController {
  constructor(
    private uploads: UploadsService,
    private auth: AuthService,
  ) { }

  @Post('check-hash')
  async checkHash(@Body() body: { hash: string }) {
    const hash = (body?.hash ?? '').toLowerCase().trim();
    return this.uploads.checkHashExists(hash);
  }

  // anonym erlaubt
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('clientHash') clientHash: string | undefined,
    @Req() req: Request,
  ) {
    const userId = getOptionalUserId(req, this.auth);
    return this.uploads.storeFile(file, userId, clientHash);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25',
  ): Promise<{ items: UploadListItem[]; total: number; page: number; pageSize: number }> {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 25));
    return this.uploads.listUploadsPaged(p, ps);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const info = await this.uploads.getDownloadInfo(id);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${info.originalName}"`,
    );
    res.sendFile(info.fullPath);
  }
}

