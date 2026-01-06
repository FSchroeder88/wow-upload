import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_EXT = ['.7z', '.rar', '.zip', '.pkt', '.tar.gz'] as const;

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getNormalizedExt(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tar.gz')) return '.tar.gz';
  return path.extname(lower);
}

export type UploadListItem = {
  id: number;
  originalName: string;
  size: number;
  createdAt: Date;
};

@Injectable()
export class UploadsService {
  constructor(private prisma: PrismaService) {}

  private validateFile(file: Express.Multer.File | undefined): string {
    if (!file) throw new BadRequestException('No file provided');

    const ext = getNormalizedExt(file.originalname);
    if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
      throw new BadRequestException(
        `File type not allowed. Allowed: ${ALLOWED_EXT.join(', ')}`,
      );
    }

    const maxBytes = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxBytes) {
      throw new BadRequestException('File too large (max 2GB)');
    }

    return ext;
  }

  async storeFile(
    file: Express.Multer.File | undefined,
    uploaderId?: number | null,
  ): Promise<UploadListItem> {
    ensureUploadDir();

    const ext = this.validateFile(file);
    const storageName = `${randomUUID()}${ext}`;
    const fullPath = path.join(UPLOAD_DIR, storageName);

    await fs.promises.writeFile(fullPath, file!.buffer);

    const record = await this.prisma.upload.create({
      data: {
        originalName: file!.originalname,
        storageName,
        mimeType: file!.mimetype ?? 'application/octet-stream',
        size: file!.size,
        uploaderId: uploaderId ?? null,
      },
      select: {
        id: true,
        originalName: true,
        size: true,
        createdAt: true,
      },
    });

    return record;
  }

  async listUploads(): Promise<UploadListItem[]> {
    return this.prisma.upload.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        size: true,
        createdAt: true,
      },
    });
  }

  async getDownloadInfo(
    id: number,
  ): Promise<{ originalName: string; fullPath: string }> {
    const upload = await this.prisma.upload.findUnique({
      where: { id },
      select: { storageName: true, originalName: true },
    });

    if (!upload) throw new NotFoundException('Upload not found');

    const fullPath = path.join(process.cwd(), 'uploads', upload.storageName);
    if (!fs.existsSync(fullPath))
      throw new NotFoundException('File missing on disk');

    return { originalName: upload.originalName, fullPath };
  }
}
