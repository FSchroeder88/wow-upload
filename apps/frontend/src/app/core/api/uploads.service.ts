import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { Observable, map } from 'rxjs';

export type UploadListItem = {
  id: number;
  originalName: string;
  size: number;
  createdAt: string; // kommt als ISO string
};

export type UploadResult = {
  id: number;
  originalName: string;
  size: number;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly apiBase = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  list(): Observable<UploadListItem[]> {
    return this.http.get<UploadListItem[]>(`${this.apiBase}/uploads`, {
      withCredentials: true,
    });
  }

  uploadFile(file: File): Observable<{ progress: number; done?: UploadResult }> {
    const form = new FormData();
    form.append('file', file);

    const req = new HttpRequest('POST', `${this.apiBase}/uploads`, form, {
      reportProgress: true,
      withCredentials: true, // wichtig: damit Cookie bei eingeloggten mitsendet
    });

    return this.http.request(req).pipe(
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? file.size ?? 0;
          const progress = total ? Math.round((100 * event.loaded) / total) : 0;
          return { progress };
        }
        if (event.type === HttpEventType.Response) {
          return { progress: 100, done: event.body as UploadResult };
        }
        return { progress: 0 };
      })
    );
  }

  downloadUrl(id: number): string {
    return `${this.apiBase}/uploads/${id}/download`;
  }
}
