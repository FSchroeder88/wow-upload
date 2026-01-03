import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly apiBase = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  health(): Observable<{ ok: boolean; ts: string }> {
    return this.http.get<{ ok: boolean; ts: string }>(
      `${this.apiBase}/health`,
      { withCredentials: true }
    );
  }
}
