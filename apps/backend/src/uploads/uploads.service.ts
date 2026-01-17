import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash, randomUUID } from 'crypto';
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
  constructor(private prisma: PrismaService) { }

  private validateFile(file: Express.Multer.File | undefined): string {
    if (!file) throw new BadRequestException('No file provided');

    const ext = getNormalizedExt(file.originalname);
    if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
      throw new BadRequestException(
        `File type not allowed. Allowed: ${ALLOWED_EXT.join(', ')}`,
      );
    }

    // Wenn ihr "kein Limit" wollt, diesen Block entfernen.
    const maxBytes = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxBytes) {
      throw new BadRequestException('File too large (max 2GB)');
    }

    return ext;
  }

  async checkHashExists(hash: string) {
    const normalized = (hash ?? '').toLowerCase().trim();
    if (!/^[a-f0-9]{64}$/.test(normalized)) {
      return { exists: false };
    }

    const existing = await this.prisma.upload.findUnique({
      where: { hash: normalized },
      select: { id: true },
    });

    return { exists: !!existing };
  }

  async storeFile(
    file: Express.Multer.File,
    uploaderId?: number | null,
    clientHash?: string,
  ): Promise<UploadListItem> {
    ensureUploadDir();

    const ext = this.validateFile(file);
    const storageName = `${randomUUID()}${ext}`;
    const fullPath = path.join(UPLOAD_DIR, storageName);

    const normalizedClientHash = (clientHash ?? '').toLowerCase().trim();
    if (normalizedClientHash && !/^[a-f0-9]{64}$/.test(normalizedClientHash)) {
      throw new BadRequestException('Invalid clientHash (expected sha256 hex)');
    }

    // Server-side SHA-256 (trust no one)
    const serverHash = createHash('sha256').update(file.buffer).digest('hex');

    // Integrity check (optional but requested)
    if (normalizedClientHash && normalizedClientHash !== serverHash) {
      throw new BadRequestException('Hash mismatch');
    }

    // Early exists check for friendly error
    const preExisting = await this.prisma.upload.findUnique({
      where: { hash: serverHash },
      select: { id: true },
    });
    if (preExisting) {
      throw new ConflictException('File already exists');
    }

    // Write file to disk
    await fs.promises.writeFile(fullPath, file.buffer);

    try {
      const record = await this.prisma.upload.create({
        data: {
          originalName: file.originalname,
          storageName,
          mimeType: file.mimetype ?? 'application/octet-stream',
          size: file.size,
          uploaderId: uploaderId ?? null,
          hash: serverHash,
        },
        select: {
          id: true,
          originalName: true,
          size: true,
          createdAt: true,
        },
      });

      return record;
    } catch (e: any) {

      try {
        await fs.promises.unlink(fullPath);
      } catch {
        // ignore
      }

      if (e?.code === 'P2002') {
        throw new ConflictException('File already exists');
      }

      throw e;
    }
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
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File missing on disk');
    }

    return { originalName: upload.originalName, fullPath };
  }
}
