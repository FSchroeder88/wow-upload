import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

export type MeResponse =
  | { authenticated: false }
  | { authenticated: true; userId: number };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBase = 'http://localhost:3000';

  readonly me = signal<MeResponse>({ authenticated: false });
  readonly loading = signal<boolean>(true);

  constructor(private http: HttpClient) {}

  refreshMe() {
    this.loading.set(true);
    return this.http
      .get<MeResponse>(`${this.apiBase}/auth/me`, { withCredentials: true })
      .pipe(
        tap((res) => this.me.set(res)),
        catchError(() => {
          this.me.set({ authenticated: false });
          return of({ authenticated: false } as MeResponse);
        }),
        tap(() => this.loading.set(false))
      );
  }

  login() {
    // OAuth Redirect (Cookie wird im Callback gesetzt)
    window.location.href = `${this.apiBase}/auth/github`;
  }

  logout() {
    return this.http
      .get<{ ok: true }>(`${this.apiBase}/auth/logout`, { withCredentials: true })
      .pipe(tap(() => this.me.set({ authenticated: false })));
  }
}
