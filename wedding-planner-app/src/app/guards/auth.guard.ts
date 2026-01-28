import { inject } from '@angular/core';
import { Router } from '@angular/router';

// 1. Guard de Autenticación General (Para cualquier usuario logueado)
export const authGuard = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  // Comprobamos que el token exista y no sea una cadena vacía
  if (token && token.length > 0) {
    return true;
  }
  
  router.navigate(['/login']);
  return false;
};

export const adminGuard = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');

  if (token && rol === 'admin') {
    return true;
  }

  // Si no es admin, lo mandamos al home
  router.navigate(['/home']);
  return false;
};