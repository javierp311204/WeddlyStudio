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

export const authGuard = () => {
  const router = inject(Router);
  const userId = localStorage.getItem('userId'); // ← era 'token'

  if (userId && userId.length > 0) return true;

  router.navigate(['/login']);
  return false;
};

export const adminGuard = () => {
  const router = inject(Router);
  const userId = localStorage.getItem('userId'); // ← era 'token'
  const rol    = localStorage.getItem('rol');

  if (userId && (rol === 'admin' || rol === 'superadmin')) return true;

  router.navigate(['/home']);
  return false;
};

export const weddingOwnerGuard = () => {
  const router    = inject(Router);
  const userId    = localStorage.getItem('userId'); // ← era 'token'
  const weddingId = localStorage.getItem('weddingId');
  const rol       = localStorage.getItem('rol');

  if (userId && (rol === 'admin' || rol === 'superadmin')) return true;
  if (userId && weddingId) return true;

  router.navigate(['/home']);
  return false;
};

export const minRoleGuard = (minRole: string) => () => {
  const router    = inject(Router);
  const userId    = localStorage.getItem('userId'); // ← era 'token'
  const weddingId = localStorage.getItem('weddingId');
  const rol       = localStorage.getItem('rol');

  if (!userId || !weddingId) { router.navigate(['/login']); return false; }
  if (rol === 'admin' || rol === 'superadmin') return true;

  if (hasMinRole(minRole)) return true;

  router.navigate(['/dashboard']);
  return false;
};