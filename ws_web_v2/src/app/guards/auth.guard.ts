import { inject } from '@angular/core';
import { Router } from '@angular/router';

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN v2:
//  • Sin cambios en authGuard — sigue leyendo 'token' de localStorage ✅
//  • adminGuard: v2 tiene role_global 'admin' | 'superadmin'
//    → se acepta tanto 'admin' como 'superadmin' (antes solo 'admin')
//  • 'invitado' ya no existe como rol — v2 usa 'user' para usuarios normales
// ─────────────────────────────────────────────────────────────

/** Guard para cualquier usuario autenticado */
export const authGuard = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token && token.length > 0) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Guard para rutas de administrador.
 * v2: acepta role_global 'admin' o 'superadmin'
 * (antes solo comprobaba rol === 'admin')
 */
export const adminGuard = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  // v2: localStorage.getItem('rol') guarda role_global del JWT
  const rol = localStorage.getItem('rol');

  if (token && (rol === 'admin' || rol === 'superadmin')) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};