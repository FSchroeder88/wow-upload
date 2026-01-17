import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/api/auth.service';
import { UploadsService, UploadListItem } from './core/api/uploads.service';
import { createSHA256 } from 'hash-wasm';
import { firstValueFrom } from 'rxjs';

type QueueItem = {
  file: File;
  progress: number;
  status: 'queued' | 'hashing' | 'uploading' | 'done' | 'error';
  error?: string;
  hash?: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  constructor(public auth: AuthService, private uploadsApi: UploadsService) { }

  uploads = signal<UploadListItem[]>([]);
  queue = signal<QueueItem[]>([]);
  uploading = signal<boolean>(false);



  isAuthed = computed(() => this.auth.me().authenticated === true);
  user = computed(() => {
    const me = this.auth.me();
    return me.authenticated ? me.user : null;
  });

  download(id: number) {
    window.location.href = this.downloadUrl(id);
  }


  private readonly allowed = ['.7z', '.rar', '.zip', '.pkt', '.tar.gz'];

  ngOnInit(): void {
    this.auth.refreshMe().subscribe({
      next: () => {
        if (this.isAuthed()) this.reloadUploads();
      },
      error: () => {
        // ignore - me() wird in AuthService auf unauth gesetzt
      },
    });
  }

  onPickFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.addToQueue(files);
    input.value = '';
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const files = Array.from(ev.dataTransfer?.files ?? []);
    this.addToQueue(files);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  onLogout() {
    this.auth.logout().subscribe({
      next: () => {
        this.uploads.set([]);
        this.queue.set([]);
      },
      error: () => {
        this.uploads.set([]);
        this.queue.set([]);
      },
    });
  }

  hasQueued = computed(() => this.queue().some(q => q.status === 'queued'));


  // --------- Queue helpers ---------

  private isAllowed(name: string): boolean {
    const lower = name.toLowerCase();
    return this.allowed.some((ext) => lower.endsWith(ext));
  }

  private getExt(name: string): string {
    const lower = name.toLowerCase();
    if (lower.endsWith('.tar.gz')) return '.tar.gz';
    const idx = lower.lastIndexOf('.');
    return idx >= 0 ? lower.slice(idx) : '';
  }

  addToQueue(files: File[]) {
    if (!files.length) return;

    const mapped: QueueItem[] = files.map((f) => {
      if (!this.isAllowed(f.name)) {
        return {
          file: f,
          progress: 0,
          status: 'error',
          error: `File type not allowed (${this.getExt(f.name) || 'unknown'
            }). Allowed: ${this.allowed.join(', ')}`,
        };
      }

      return {
        file: f,
        progress: 0,
        status: 'queued',
      };
    });

    this.queue.set([...this.queue(), ...mapped]);
  }

  removeFromQueue(index: number) {
    // optional: wenn gerade uploading und genau dieses Item -> nicht erlauben
    const copy = [...this.queue()];
    const item = copy[index];
    if (!item) return;

    if (item.status === 'uploading') return; // simple safety
    copy.splice(index, 1);
    this.queue.set(copy);
  }

  clearDone() {
    this.queue.set(this.queue().filter((q) => q.status !== 'done'));
  }

  clearErrors() {
    this.queue.set(this.queue().filter((q) => q.status !== 'error'));
  }

  // --------- Upload queue runner ---------

  startUploadQueue() {
    if (this.uploading()) return;

    const nextIndex = this.queue().findIndex((q) => q.status === 'queued');
    if (nextIndex === -1) return;

    this.uploading.set(true);
    this.uploadOne(nextIndex);
  }

  private async uploadOne(index: number) {
    const item = this.queue()[index];
    if (!item) {
      this.uploading.set(false);
      return;
    }

    try {
      // 1) Hashing
      this.updateQueue(index, { status: 'hashing', progress: 0, error: undefined });

      const hash = await this.sha256File(item.file);
      this.updateQueue(index, { hash });

      // 2) Check hash exists
      const existsRes = await firstValueFrom(this.uploadsApi.checkHash(hash));
      if (existsRes?.exists) {
        this.updateQueue(index, {
          status: 'error',
          error: 'File already exists on server (same SHA-256).',
        });
        this.uploading.set(false);
        this.startUploadQueue();
        return;
      }

      // 3) Upload (send clientHash)
      this.updateQueue(index, { status: 'uploading', progress: 0 });

      this.uploadsApi.uploadFile(item.file, hash).subscribe({
        next: (ev) => {
          if (typeof ev.progress === 'number') {
            this.updateQueue(index, { progress: ev.progress });
          }
          if (ev.done) {
            this.updateQueue(index, { status: 'done', progress: 100 });
            if (this.isAuthed()) this.reloadUploads();
          }
        },
        error: (err) => {
          // 409 vom Backend = existiert (Race condition)
          const msg =
            err?.status === 409
              ? 'File already exists on server (race condition).'
              : 'Upload failed';

          this.updateQueue(index, { status: 'error', error: msg });
          this.uploading.set(false);
          this.startUploadQueue();
        },
        complete: () => {
          this.uploading.set(false);
          this.startUploadQueue();
        },
      });
    } catch (e: any) {
      this.updateQueue(index, { status: 'error', error: 'Hashing failed' });
      this.uploading.set(false);
      this.startUploadQueue();
    }
  }

  private updateQueue(index: number, patch: Partial<QueueItem>) {
    const copy = [...this.queue()];
    copy[index] = { ...copy[index], ...patch };
    this.queue.set(copy);
  }

  // --------- Upload listing ---------

  reloadUploads() {
    this.uploadsApi.list().subscribe({
      next: (list) => this.uploads.set(list),
      error: () => this.uploads.set([]),
    });
  }

  downloadUrl(id: number) {
    return this.uploadsApi.downloadUrl(id);
  }

  private async sha256File(file: File): Promise<string> {
    const hasher = await createSHA256();
    const chunkSize = 4 * 1024 * 1024; // 4MB
    let offset = 0;

    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      const buf = await slice.arrayBuffer();
      hasher.update(new Uint8Array(buf));
      offset += chunkSize;
    }

    return hasher.digest('hex');
  }

}
