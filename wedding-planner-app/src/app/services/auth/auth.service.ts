import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('rol');
  }

  isAdmin(): boolean {
    return localStorage.getItem('rol') === 'admin';
  }

  verificarEmail(token: string) {
  return this.http.get(`${this.API_URL}/auth/verificar-email/${token}`);
  }

  getUserEmail(): string {
    return localStorage.getItem('usuarioEmail') || 'Usuario';
  }

  getUserNick(): string {
    return localStorage.getItem('usuarioNick') || 'Usuario';
  }

  getCodigoBoda(): string {
    return localStorage.getItem('codigoBoda') || '';
  }



  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('nick');
    localStorage.removeItem('rol');
    localStorage.removeItem('codigoBoda');
    
    window.location.href = '/home';
  }
}
