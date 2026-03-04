import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
  // FIX: era 3001, todos los demás servicios usan 3000
  private API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ─── Login ──────────────────────────────────────────────────
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, { email, password }).pipe(
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
      }),
      // Tras guardar el token, cargar la primera boda activa del usuario
      // para que getWeddingId() funcione en toda la app
      switchMap(res => {
        if (!res.success) return of(res);
        return this.http.get<any>(`${this.API_URL}/weddings`).pipe(
          tap(bodas => {
            // La API devuelve { success, data: [...] } o { weddings: [...] }
            const lista: any[] = bodas?.data ?? bodas?.weddings ?? [];
            if (lista.length > 0) {
              localStorage.setItem('weddingId', lista[0].id);
            }
          }),
          catchError(() => of(res)), // si falla, login sigue siendo válido
          // devolver el LoginResponse original al componente
          switchMap(() => of(res))
        );
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

  // ─── Helpers ────────────────────────────────────────────────
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    const role = localStorage.getItem('rol');
    return role === 'admin' || role === 'superadmin';
  }

  getUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  getUserEmail(): string {
    return localStorage.getItem('userEmail') || '';
  }

  getFirstName(): string {
    return localStorage.getItem('firstName') || '';
  }

  /** Compatibilidad con código que usaba getUserNick() */
  getUserNick(): string {
    return localStorage.getItem('firstName') || '';
  }

  /**
   * UUID de la boda activa. Se rellena automáticamente tras el login.
   * v2: sustituye a getCodigoBoda().
   */
  getWeddingId(): string {
    return localStorage.getItem('weddingId') || '';
  }

  /**
   * Permite cambiar la boda activa manualmente (si el usuario tiene varias).
   */
  setWeddingId(weddingId: string): void {
    localStorage.setItem('weddingId', weddingId);
  }

  // ─── Logout ──────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('rol');
    localStorage.removeItem('weddingId');
    // Limpiar claves del backend viejo
    localStorage.removeItem('nick');
    localStorage.removeItem('codigoBoda');
    localStorage.removeItem('usuarioEmail');
    localStorage.removeItem('usuarioNick');
    window.location.href = '/home';
  }
}