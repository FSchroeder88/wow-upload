import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/api/auth.service';
import { UploadsService, UploadListItem } from './core/api/uploads.service';

type QueueItem = {
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  constructor(public auth: AuthService, private uploadsApi: UploadsService) {}

  uploads = signal<UploadListItem[]>([]);
  queue = signal<QueueItem[]>([]);
  uploading = signal<boolean>(false);

  isAuthed = computed(() => this.auth.me().authenticated === true);

  ngOnInit(): void {
    // beim Start Login-Status holen
    this.auth.refreshMe().subscribe({
      next: () => {
        if (this.isAuthed()) this.reloadUploads();
      },
    });
  }

  onPickFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.addToQueue(files);
    input.value = '';
  }

  onLogout() {
    this.auth.logout().subscribe({
      next: () => this.uploads.set([]),
      error: () => this.uploads.set([]),
    });
  }

  private readonly allowed = ['.pkt', '.zip', '.7z', '.rar', '.tar.gz'];

  private isAllowed(name: string): boolean {
    const lower = name.toLowerCase();
    return this.allowed.some((ext) => lower.endsWith(ext));
  }

  addToQueue(files: File[]) {
    const allowedFiles = files.filter((f) => this.isAllowed(f.name));

    const mapped = allowedFiles.map((f) => ({
      file: f,
      progress: 0,
      status: 'queued' as const,
    }));

    this.queue.set([...this.queue(), ...mapped]);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const files = Array.from(ev.dataTransfer?.files ?? []);
    this.addToQueue(files);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

/*   addToQueue(files: File[]) {
    if (!files.length) return;

    const mapped: QueueItem[] = files.map((f) => ({
      file: f,
      progress: 0,
      status: 'queued',
    }));

    this.queue.set([...this.queue(), ...mapped]);
  } */

  startUploadQueue() {
    if (this.uploading()) return;

    const nextIndex = this.queue().findIndex((q) => q.status === 'queued');
    if (nextIndex === -1) return;

    this.uploading.set(true);
    this.uploadOne(nextIndex);
  }

  private uploadOne(index: number) {
    const item = this.queue()[index];
    if (!item) return;

    // status -> uploading
    this.updateQueue(index, { status: 'uploading', progress: 0 });

    this.uploadsApi.uploadFile(item.file).subscribe({
      next: (ev) => {
        if (typeof ev.progress === 'number') {
          this.updateQueue(index, { progress: ev.progress });
        }
        if (ev.done) {
          this.updateQueue(index, { status: 'done', progress: 100 });
          // wenn eingeloggt, Liste aktualisieren
          if (this.isAuthed()) this.reloadUploads();
        }
      },
      error: (err: unknown) => {
        this.updateQueue(index, {
          status: 'error',
          error: 'Upload failed',
        });
        this.uploading.set(false);
        this.startUploadQueue(); // weiter mit dem nächsten
      },
      complete: () => {
        this.uploading.set(false);
        this.startUploadQueue(); // nächstes queued file
      },
    });
  }

  private updateQueue(index: number, patch: Partial<QueueItem>) {
    const copy = [...this.queue()];
    copy[index] = { ...copy[index], ...patch };
    this.queue.set(copy);
  }

  reloadUploads() {
    this.uploadsApi.list().subscribe({
      next: (list) => this.uploads.set(list),
      error: () => this.uploads.set([]),
    });
  }

  downloadUrl(id: number) {
    return this.uploadsApi.downloadUrl(id);
  }
}
