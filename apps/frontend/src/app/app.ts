import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { createSHA256 } from 'hash-wasm';

import { AuthService } from './core/api/auth.service';
import { UploadsService, UploadListItem } from './core/api/uploads.service';

type QueueStatus = 'queued' | 'hashing' | 'checking' | 'uploading' | 'done' | 'error';

type QueueItem = {
  file: File;
  progress: number;
  status: QueueStatus;
  error?: string;
  hash?: string; // clientseitig berechneter SHA-256
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

  // ---- UI State (Signals) ----
  uploads = signal<UploadListItem[]>([]);
  totalUploads = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(25);

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalUploads() / this.pageSize()))
  );
  total = signal<number>(0);
  queue = signal<QueueItem[]>([]);
  uploading = signal<boolean>(false);

  // ---- Auth helpers ----
  isAuthed = computed(() => this.auth.me().authenticated === true);

  user = computed(() => {
    const me = this.auth.me();
    return me.authenticated ? me.user : null;
  });

  // Erlaubte Dateiendungen (clientseitige Validierung)
  private readonly allowed = ['.7z', '.rar', '.zip', '.pkt', '.tar.gz'];

  // -----------------------------------------
  // Lifecycle
  // -----------------------------------------
  ngOnInit(): void {
    // Beim Start User-Session abfragen.
    // Wenn eingeloggt -> Upload-Liste laden
    this.auth.refreshMe().subscribe({
      next: () => {
        if (this.isAuthed()) this.reloadUploads();
      },
      error: () => {
        // ignore – AuthService setzt me() im Fehlerfall auf unauth
      },
    });
  }

  // -----------------------------------------
  // UI Events
  // -----------------------------------------
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

  // In deinem Template nutzt du das zum Disable vom Start-Button
  hasQueued = computed(() => this.queue().some((q) => q.status === 'queued'));

  // Download (über Backend-URL)
  download(id: number) {
    window.location.href = this.downloadUrl(id);
  }

  // -----------------------------------------
  // Helpers: UI Formatierung
  // -----------------------------------------
  formatMB(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }


  // -----------------------------------------
  // Queue: Add/Remove/Clear
  // -----------------------------------------
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
          error: `File type not allowed (${this.getExt(f.name) || 'unknown'}). Allowed: ${this.allowed.join(', ')}`,
        };
      }

      return { file: f, progress: 0, status: 'queued' };
    });

    this.queue.set([...this.queue(), ...mapped]);
  }

  shortHash(hash: string) {
    if (!hash) return '';
    return hash.slice(0, 10) + '…' + hash.slice(-10);
  }

  async copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      // fallback optional
    }
  }

  removeFromQueue(index: number) {
    const copy = [...this.queue()];
    const item = copy[index];
    if (!item) return;

    // Sicherheitscheck: während Upload nicht entfernen
    if (item.status === 'uploading') return;

    copy.splice(index, 1);
    this.queue.set(copy);
  }

  clearDone() {
    this.queue.set(this.queue().filter((q) => q.status !== 'done'));
  }

  clearErrors() {
    this.queue.set(this.queue().filter((q) => q.status !== 'error'));
  }

  // -----------------------------------------
  // Queue Runner
  // -----------------------------------------
  startUploadQueue() {
    if (this.uploading()) return;

    const nextIndex = this.queue().findIndex((q) => q.status === 'queued');
    if (nextIndex === -1) return;

    this.uploading.set(true);

    // uploadOne ist async, wir "fire-and-forget" und steuern Ablauf intern
    void this.uploadOne(nextIndex);
  }

  private async uploadOne(index: number) {
    const item = this.queue()[index];
    if (!item) {
      this.uploading.set(false);
      return;
    }

    try {
      // 1) Hash clientseitig berechnen (chunked -> RAM-schonend)
      this.updateQueue(index, { status: 'hashing', progress: 0, error: undefined });

      const hash = await this.sha256FileChunked(item.file);
      this.updateQueue(index, { hash, status: 'checking' });

      // 2) Backend fragen, ob Hash bereits existiert
      const check = await firstValueFrom(this.uploadsApi.checkHash(hash));
      if (check.exists) {
        this.updateQueue(index, {
          status: 'error',
          error: 'File already exists (duplicate SHA-256)',
          progress: 0,
        });

        // nächsten queued Upload versuchen
        this.uploading.set(false);
        this.startUploadQueue();
        return;
      }

      // 3) Upload durchführen (mit clientHash als Body-Feld)
      this.updateQueue(index, { status: 'uploading', progress: 0 });

      this.uploadsApi.uploadFile(item.file, hash).subscribe({
        next: (ev) => {
          if (typeof ev.progress === 'number') {
            this.updateQueue(index, { progress: ev.progress });
          }
          if (ev.done) {
            this.updateQueue(index, { status: 'done', progress: 100 });

            // Upload-Liste nur für eingeloggte User sichtbar
            if (this.isAuthed()) this.reloadUploads();
          }
        },
        error: (err) => {
          const msg =
            err?.status === 409
              ? 'File already exists (server reported duplicate)'
              : 'Upload failed';

          this.updateQueue(index, { status: 'error', error: msg });

          // Queue weiterlaufen lassen
          this.uploading.set(false);
          this.startUploadQueue();
        },
        complete: () => {
          // Weiter mit dem nächsten Item
          this.uploading.set(false);
          this.startUploadQueue();
        },
      });
    } catch (e) {
      // z.B. Hashing-Fehler
      this.updateQueue(index, { status: 'error', error: 'Hashing/check failed' });
      this.uploading.set(false);
      this.startUploadQueue();
    }
  }

  private updateQueue(index: number, patch: Partial<QueueItem>) {
    const copy = [...this.queue()];
    copy[index] = { ...copy[index], ...patch };
    this.queue.set(copy);
  }

  // -----------------------------------------
  // Upload Listing / Download URL
  // -----------------------------------------
  reloadUploads() {
    this.uploadsApi.list(this.page(), this.pageSize()).subscribe({
      next: (res) => {
        this.uploads.set(res.items);
        this.totalUploads.set(res.total);
        this.page.set(res.page);
        this.pageSize.set(res.pageSize);
      },
      error: () => {
        this.uploads.set([]);
        this.totalUploads.set(0);
      },
    });
  }

  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.set(this.page() + 1);
      this.reloadUploads();
    }
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
      this.reloadUploads();
    }
  }


  downloadUrl(id: number) {
    return this.uploadsApi.downloadUrl(id);
  }

  // -----------------------------------------
  // SHA-256 (chunked, RAM-schonend)
  // -----------------------------------------
  private async sha256FileChunked(file: File): Promise<string> {
    const hasher = await createSHA256();

    // 4MB chunks sind ein guter Kompromiss
    const chunkSize = 4 * 1024 * 1024;

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
