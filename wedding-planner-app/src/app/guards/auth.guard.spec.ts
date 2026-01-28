import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard, adminGuard } from './auth.guard';

describe('Guards de Autenticación', () => {
  // Simulamos el Router
  const routerSpy = { navigate: jasmine.createSpy('navigate') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    });
    // Limpiamos el localStorage antes de cada prueba
    localStorage.clear();
  });

  it('authGuard debe denegar acceso si no hay token', () => {
    // Ejecutamos el guard en el contexto de Angular
    const result = TestBed.runInInjectionContext(() => authGuard());
    
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('authGuard debe permitir acceso si hay token', () => {
    localStorage.setItem('token', 'fake-token');
    const result = TestBed.runInInjectionContext(() => authGuard());
    
    expect(result).toBeTrue();
  });

  it('adminGuard debe denegar acceso si el rol no es admin', () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('rol', 'invitado');
    
    const result = TestBed.runInInjectionContext(() => adminGuard());
    
    expect(result).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });
});