import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface LoginResponse {
  success: boolean;
  data: {
    access_token:  string;
    refresh_token: string;
    user: {
      id:          string;
      email:       string;
      first_name:  string;
      last_name:   string;
      role_global: 'user' | 'admin' | 'superadmin';
    };
  };
}

export interface RegisterPayload {
  first_name: string;
  last_name:  string;
  email:      string;
  password:   string;
  nickname?:  string;
  phone?:     string;
  language?:  string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ─── Login ──────────────────────────────────────────────────
  // FIX: eliminado el switchMap que llamaba a GET /api/weddings justo
  // tras el login. Ese GET podía interceptarse como 401 si el token
  // aún no estaba propagado, lo que disparaba clearSession() → logout.
  // La carga de bodas ahora la hace HomeComponent en su ngOnInit.
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.API_URL}/auth/login`,
      { email, password }
    ).pipe(
      tap(res => {
        if (res.success) {
          localStorage.setItem('token',         res.data.access_token);
          localStorage.setItem('refresh_token', res.data.refresh_token);
          localStorage.setItem('userId',        res.data.user.id);
          localStorage.setItem('userEmail',     res.data.user.email);
          localStorage.setItem('firstName',     res.data.user.first_name);
          localStorage.setItem('lastName',      res.data.user.last_name);
          localStorage.setItem('rol',           res.data.user.role_global);
        }
      })
    );
  }

  // ─── Register ───────────────────────────────────────────────
  register(payload: RegisterPayload): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, payload);
  }

  // ─── Perfil ─────────────────────────────────────────────────
  getMe(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/me`);
  }

  // ─── Refresh token ──────────────────────────────────────────
  refreshToken(): Observable<any> {
    const refresh_token = localStorage.getItem('refresh_token');
    return this.http.post(`${this.API_URL}/auth/refresh`, { refresh_token }).pipe(
      tap((res: any) => {
        if (res.success) {
          localStorage.setItem('token', res.data.access_token);
        }
      })
    );
  }

  // ─── Cambiar contraseña ──────────────────────────────────────
  changePassword(current_password: string, new_password: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/auth/change-password`, {
      current_password,
      new_password,
    });
  }

  // ─── Cargar boda activa ──────────────────────────────────────
  // Llamado por HomeComponent tras login para obtener el weddingId
  loadActiveWedding(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/weddings`);
  }

  // ─── Helpers ────────────────────────────────────────────────
  isLoggedIn(): boolean { return !!localStorage.getItem('token'); }

  isAdmin(): boolean {
    const role = localStorage.getItem('rol');
    return role === 'admin' || role === 'superadmin';
  }

  isWeddingOwner(): boolean {
    const rol       = localStorage.getItem('rol');
    const weddingId = localStorage.getItem('weddingId');
    return (rol === 'admin' || rol === 'superadmin') || !!weddingId;
  }

  getUserId():    string { return localStorage.getItem('userId')    || ''; }
  getUserEmail(): string { return localStorage.getItem('userEmail') || ''; }
  getFirstName(): string { return localStorage.getItem('firstName') || ''; }
  getUserNick():  string { return localStorage.getItem('firstName') || ''; }

  getWeddingId(): string { return localStorage.getItem('weddingId') || ''; }
  setWeddingId(id: string): void { localStorage.setItem('weddingId', id); }

  // ─── Logout ──────────────────────────────────────────────────
  logout(): void {
    [
      'token','refresh_token','userId','userEmail',
      'firstName','lastName','rol','weddingId',
      'nick','codigoBoda','usuarioEmail','usuarioNick'
    ].forEach(k => localStorage.removeItem(k));
    window.location.href = '/home';
  }
}