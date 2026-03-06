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

/** Guard para el dueño/organizador de una boda (cualquier role_global) */
export const weddingOwnerGuard = () => {
  const router = inject(Router);
  const token     = localStorage.getItem('token');
  const weddingId = localStorage.getItem('weddingId');
  const rol       = localStorage.getItem('rol');

  // Superadmin siempre pasa
  if (token && (rol === 'admin' || rol === 'superadmin')) return true;

  // Usuario normal con boda activa también pasa
  if (token && weddingId) return true;

  router.navigate(['/home']);
  return false;
};