import { inject } from '@angular/core';
import { Router }  from '@angular/router';

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

/** Usuarios autenticados. Redirige a /login si no hay sesión. */
export const authGuard = () => {
  const router = inject(Router);
  const userId = localStorage.getItem('userId');

  if (userId && userId.length > 0) return true;

  router.navigate(['/login']);
  return false;
};

/** Solo admins/superadmins. Redirige a /home (landing) si no. */
export const adminGuard = () => {
  const router = inject(Router);
  const userId = localStorage.getItem('userId');
  const rol    = localStorage.getItem('rol');

  if (userId && (rol === 'admin' || rol === 'superadmin')) return true;

  router.navigate(['/home']);
  return false;
};

/**
 * El usuario está logueado Y tiene una boda activa.
 * Los admins globales pasan siempre.
 * Si no tiene boda, redirige al dashboard (que gestionará el onboarding).
 */
export const weddingOwnerGuard = () => {
  const router    = inject(Router);
  const userId    = localStorage.getItem('userId');
  const weddingId = localStorage.getItem('weddingId');
  const rol       = localStorage.getItem('rol');

  if (userId && (rol === 'admin' || rol === 'superadmin')) return true;
  if (userId && weddingId) return true;

  // Sin boda: manda al dashboard para que gestione el flujo
  router.navigate(['/dashboard']);
  return false;
};

/**
 * Requiere un rol mínimo dentro de la boda.
 * Uso: canActivate: [minRoleGuard('planner')]
 */
export const minRoleGuard = (minRole: string) => () => {
  const router    = inject(Router);
  const userId    = localStorage.getItem('userId');
  const weddingId = localStorage.getItem('weddingId');
  const rol       = localStorage.getItem('rol');

  if (!userId || !weddingId) { router.navigate(['/login']); return false; }
  if (rol === 'admin' || rol === 'superadmin') return true;
  if (hasMinRole(minRole)) return true;

  // Sin permiso suficiente: manda al dashboard
  router.navigate(['/dashboard']);
  return false;
};