import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// LoginResponse — unión discriminada por requires_2fa
// El backend envuelve TODO en { success, data: { ... } }

export interface LoginUser {
  id:          string;
  email:       string;
  first_name:  string;
  last_name:   string;
  role_global: 'user' | 'admin' | 'superadmin';
}

// Lo que devuelve el backend en ambos casos
export interface LoginResponseNormal {
  success:      boolean;
  requires_2fa: false;
  data: {
    requires_2fa:  false;
    access_token:  string;
    refresh_token: string;
    user:          LoginUser;
  };
}

export interface LoginResponse2FA {
  success:      boolean;
  requires_2fa?: true;   // puede venir en raíz O solo en data
  data: {
    requires_2fa: true;
    temp_token:   string;
  };
}

export type LoginResponse = LoginResponseNormal | LoginResponse2FA;

export interface RegisterPayload {
  first_name: string;
  last_name:  string;
  email:      string;
  password:   string;
  nickname?:  string;
  phone?:     string;
  language?:  string;
}

export type WeddingRole = 'owner' | 'co_organizer' | 'planner' | 'guest';

const ROLE_HIERARCHY: Record<string, number> = {
  guest: 1, planner: 2, co_organizer: 3, owner: 4,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private API_URL = 'https://weddly-api-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.API_URL}/auth/login`,
      { email: email.trim().toLowerCase(), password }
    ).pipe(
      tap(res => {
        // FIX: el backend envuelve en data, comprobar AMBOS lugares
        const requires2fa = res.data?.requires_2fa ?? (res as any).requires_2fa ?? false;
        if (requires2fa) return;  // no guardar nada — login.component redirige a /auth/2fa

        // Login normal
        if (res.success) {
          const d = (res as LoginResponseNormal).data;
          localStorage.setItem('token',         d.access_token);
          localStorage.setItem('refresh_token', d.refresh_token);
          localStorage.setItem('userId',        d.user.id);
          localStorage.setItem('userEmail',     d.user.email);
          localStorage.setItem('firstName',     d.user.first_name);
          localStorage.setItem('lastName',      d.user.last_name);
          localStorage.setItem('rol',           d.user.role_global);
        }
      })
    );
  }

  register(payload: RegisterPayload): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, payload);
  }

  getMe(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/me`);
  }

  refreshToken(): Observable<any> {
    const refresh_token = localStorage.getItem('refresh_token');
    return this.http.post(`${this.API_URL}/auth/refresh`, { refresh_token }).pipe(
      tap((res: any) => {
        if (res.success) localStorage.setItem('token', res.data.access_token);
      })
    );
  }

  changePassword(current_password: string, new_password: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/auth/change-password`, {
      current_password, new_password,
    });
  }

  loadActiveWedding(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/weddings`);
  }

  // ── 2FA ──────────────────────────────────────────────────────
  get2faStatus(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/2fa/status`);
  }

  setup2fa(): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/2fa/setup`, {});
  }

  confirmSetup2fa(token: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/2fa/setup/verify`, { token });
  }

  disable2fa(password: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/auth/2fa`, {
      body: { password },
    } as any);
  }

  // ── Helpers básicos ──────────────────────────────────────────
  isLoggedIn(): boolean { return !!localStorage.getItem('token'); }
  isAdmin(): boolean {
    const role = localStorage.getItem('rol');
    return role === 'admin' || role === 'superadmin';
  }

  getUserId():    string { return localStorage.getItem('userId')    || ''; }
  getUserEmail(): string { return localStorage.getItem('userEmail') || ''; }
  getFirstName(): string { return localStorage.getItem('firstName') || ''; }
  getUserNick():  string { return localStorage.getItem('firstName') || ''; }
  getAvatarUrl(): string { return localStorage.getItem('avatarUrl') || ''; }
  updateAvatar(url: string): void { localStorage.setItem('avatarUrl', url); }

  getWeddingId(): string { return localStorage.getItem('weddingId') || ''; }
  setWeddingId(id: string): void { localStorage.setItem('weddingId', id); }

  getWeddingStatus(): string {
    return localStorage.getItem('weddingStatus') || 'active';
  }

  setWeddingStatus(status: string): void {
    localStorage.setItem('weddingStatus', status);
  }

  isWeddingReadonly(): boolean {
    return this.getWeddingStatus() === 'readonly';
  }

  isWeddingArchived(): boolean {
    return this.getWeddingStatus() === 'archived';
  }

  getReadonlyReason(): string {
    return localStorage.getItem('weddingReadonlyReason') || '';
  }

  setReadonlyReason(reason: string | null): void {
    if (reason) {
      localStorage.setItem('weddingReadonlyReason', reason);
    } else {
      localStorage.removeItem('weddingReadonlyReason');
    }
  }

  getWeddingRole(): WeddingRole {
    return (localStorage.getItem('weddingRole') as WeddingRole) || 'guest';
  }
  setWeddingRole(role: WeddingRole): void {
    localStorage.setItem('weddingRole', role);
  }

  hasMinRole(minRole: WeddingRole): boolean {
    const current  = ROLE_HIERARCHY[this.getWeddingRole()] ?? 0;
    const required = ROLE_HIERARCHY[minRole]               ?? 99;
    return current >= required;
  }

  isWeddingOwner():    boolean { return this.getWeddingRole() === 'owner'; }
  canManageWedding(): boolean { return this.hasMinRole('co_organizer'); }
  canManageGuests():  boolean { return this.hasMinRole('planner'); }
  canViewContent():   boolean { return this.hasMinRole('guest'); }
  canInviteMembers(): boolean { return this.hasMinRole('co_organizer'); }
  canModeratePhotos():boolean { return this.hasMinRole('co_organizer'); }

  logout(): void {
    [
      'token', 'refresh_token', 'userId', 'userEmail',
      'firstName', 'lastName', 'rol', 'weddingId', 'weddingRole',
      'avatarUrl', 'nick', 'codigoBoda', 'usuarioEmail', 'usuarioNick',
    ].forEach(k => localStorage.removeItem(k));
    window.location.href = '/home';
  }
}