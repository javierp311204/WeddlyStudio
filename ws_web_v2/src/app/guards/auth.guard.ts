import { inject } from '@angular/core';
import { Router }  from '@angular/router';

// ─────────────────────────────────────────────────────────────
// Jerarquía de roles — igual que en el backend
// ─────────────────────────────────────────────────────────────
const ROLE_HIERARCHY: Record<string, number> = {
  guest:        1,
  planner:      2,
  co_organizer: 3,
  owner:        4,
};

function hasMinRole(minRole: string): boolean {
  const current  = ROLE_HIERARCHY[localStorage.getItem('weddingRole') ?? 'guest'] ?? 0;
  const required = ROLE_HIERARCHY[minRole] ?? 99;
  return current >= required;
}

// ─────────────────────────────────────────────────────────────
// authGuard — cualquier usuario autenticado
// ─────────────────────────────────────────────────────────────
export const authGuard = () => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');

  if (token && token.length > 0) return true;

  router.navigate(['/login']);
  return false;
};

// ─────────────────────────────────────────────────────────────
// adminGuard — solo admin / superadmin
// ─────────────────────────────────────────────────────────────
export const adminGuard = () => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');
  const rol    = localStorage.getItem('rol');

  if (token && (rol === 'admin' || rol === 'superadmin')) return true;

  router.navigate(['/home']);
  return false;
};

// ─────────────────────────────────────────────────────────────
// weddingOwnerGuard — cualquier miembro con boda activa
// (antes solo comprobaba que existía weddingId — ahora igual,
//  pero las rutas sensibles usan minRoleGuard)
// ─────────────────────────────────────────────────────────────
export const weddingOwnerGuard = () => {
  const router    = inject(Router);
  const token     = localStorage.getItem('token');
  const weddingId = localStorage.getItem('weddingId');
  const rol       = localStorage.getItem('rol');

  if (token && (rol === 'admin' || rol === 'superadmin')) return true;
  if (token && weddingId) return true;

  router.navigate(['/home']);
  return false;
};

// ─────────────────────────────────────────────────────────────
// minRoleGuard — rol mínimo requerido en la boda activa
// Uso: canActivate: [authGuard, minRoleGuard('planner')]
// ─────────────────────────────────────────────────────────────
export const minRoleGuard = (minRole: string) => () => {
  const router    = inject(Router);
  const token     = localStorage.getItem('token');
  const weddingId = localStorage.getItem('weddingId');
  const rol       = localStorage.getItem('rol');

  if (!token || !weddingId) { router.navigate(['/login']);  return false; }
  if (rol === 'admin' || rol === 'superadmin') return true;

  if (hasMinRole(minRole)) return true;

  // No tiene rol suficiente → redirigir al dashboard sin romper la sesión
  router.navigate(['/dashboard']);
  return false;
};