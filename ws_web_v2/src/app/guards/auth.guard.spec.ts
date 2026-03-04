import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard, adminGuard } from './auth.guard';

describe('Guards de Autenticación', () => {
  const routerSpy = { navigate: jasmine.createSpy('navigate') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    });
    localStorage.clear();
    routerSpy.navigate.calls.reset();
  });

  // ── authGuard ──────────────────────────────────────────────

  it('authGuard debe denegar acceso si no hay token', () => {
    const result = TestBed.runInInjectionContext(() => authGuard());
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('authGuard debe permitir acceso si hay token', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    const result = TestBed.runInInjectionContext(() => authGuard());
    expect(result).toBeTrue();
  });

  // ── adminGuard ─────────────────────────────────────────────

  it('adminGuard debe denegar acceso si el rol es "user" (usuario normal v2)', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('rol', 'user'); // v2: rol normal es 'user', no 'invitado'
    const result = TestBed.runInInjectionContext(() => adminGuard());
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('adminGuard debe permitir acceso con rol "admin"', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('rol', 'admin');
    const result = TestBed.runInInjectionContext(() => adminGuard());
    expect(result).toBeTrue();
  });

  it('adminGuard debe permitir acceso con rol "superadmin" (nuevo en v2)', () => {
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('rol', 'superadmin');
    const result = TestBed.runInInjectionContext(() => adminGuard());
    expect(result).toBeTrue();
  });

  it('adminGuard debe denegar acceso si no hay token aunque el rol sea admin', () => {
    localStorage.setItem('rol', 'admin'); // sin token
    const result = TestBed.runInInjectionContext(() => adminGuard());
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });
});