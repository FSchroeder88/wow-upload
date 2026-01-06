import {
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
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const userId = getOptionalUserId(req, this.auth);
    return this.uploads.storeFile(file, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(): Promise<UploadListItem[]> {
    return this.uploads.listUploads();
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
