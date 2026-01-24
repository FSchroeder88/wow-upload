import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { map, Observable } from 'rxjs';

export type UploadListItem = {
  id: number;
  originalName: string;
  size: number;
  hash: string;
  createdAt: string;
};

export type UploadListResponse = {
  items: UploadListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type UploadProgressEvent = { progress?: number; done?: boolean };

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly apiBase = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  list(page = 1, pageSize = 25) {
    return this.http.get<UploadListResponse>(
      `${this.apiBase}/uploads?page=${page}&pageSize=${pageSize}`,
      { withCredentials: true },
    );
  }

  downloadUrl(id: number) {
    return `${this.apiBase}/uploads/${id}/download`;
  }

  checkHash(hash: string) {
    return this.http.post<{ exists: boolean }>(
      `${this.apiBase}/uploads/check-hash`,
      { hash },
      { withCredentials: true }
    );
  }

  uploadFile(file: File, clientHash?: string): Observable<UploadProgressEvent> {
    const form = new FormData();
    form.append('file', file);
    if (clientHash) form.append('clientHash', clientHash);

    const req = new HttpRequest('POST', `${this.apiBase}/uploads`, form, {
      reportProgress: true,
      withCredentials: true,
    });

    return this.http.request(req).pipe(
      map((ev: HttpEvent<any>) => {
        if (ev.type === HttpEventType.UploadProgress) {
          const total = ev.total ?? file.size ?? 1;
          const progress = Math.round((100 * ev.loaded) / total);
          return { progress };
        }
        if (ev.type === HttpEventType.Response) {
          return { done: true, progress: 100 };
        }
        return {};
      })
    );
  }
}
