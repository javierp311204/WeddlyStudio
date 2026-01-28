import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isLoggedIn(): boolean {
    return !!localStorage.getItem('rol');
  }

  isAdmin(): boolean {
    return localStorage.getItem('rol') === 'admin';
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
