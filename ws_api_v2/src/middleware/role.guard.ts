import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from './errorHandler.middleware';

// Jerarquía de roles — mayor número = más permisos
const ROLE_HIERARCHY: Record<string, number> = {
  guest:        1,
  planner:      2,
  co_organizer: 3,
  owner:        4,
};

/**
 * Middleware que verifica que el usuario autenticado tiene uno de los
 * roles requeridos en la boda especificada por el parámetro de ruta.
 *
 * Uso:
 *   router.patch('/:id', roleGuard('owner', 'co_organizer'), controller.update)
 *
 * El weddingId se lee de req.params.id | req.params.weddingId | req.params.wedding_id
 */
export const roleGuard = (...rolesPermitidos: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new AppError('No autenticado', 401));

      // Leer weddingId del parámetro que corresponda según la ruta
      const weddingId =
        req.params.id ??
        req.params.weddingId ??
        req.params.wedding_id;

      if (!weddingId) return next(new AppError('ID de boda requerido', 400));

      const userRole = await prisma.userWeddingRole.findFirst({
        where: { wedding_id: weddingId, user_id: req.user.userId },
        select: { role: true },
      });

      if (!userRole) {
        return next(new AppError('No eres miembro de esta boda', 403));
      }

      const nivelUsuario   = ROLE_HIERARCHY[userRole.role]    ?? 0;
      const nivelMinimo    = Math.min(...rolesPermitidos.map(r => ROLE_HIERARCHY[r] ?? 99));

      if (nivelUsuario < nivelMinimo || !rolesPermitidos.includes(userRole.role)) {
        return next(new AppError(
          `Acción no permitida para el rol "${userRole.role}". ` +
          `Se requiere: ${rolesPermitidos.join(' | ')}`,
          403,
        ));
      }

      // Inyectar el rol en req para que los controllers lo puedan usar sin otra query
      (req as any).weddingRole = userRole.role;

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Versión mínima: cualquier miembro con rol >= al mínimo puede pasar.
 * Útil para rutas de solo lectura accesibles a todos los roles.
 *
 * Uso:
 *   router.get('/:id', minRoleGuard('guest'), controller.getById)
 */
export const minRoleGuard = (rolMinimo: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new AppError('No autenticado', 401));

      const weddingId =
        req.params.id ??
        req.params.weddingId ??
        req.params.wedding_id;

      if (!weddingId) return next(new AppError('ID de boda requerido', 400));

      const userRole = await prisma.userWeddingRole.findFirst({
        where: { wedding_id: weddingId, user_id: req.user.userId },
        select: { role: true },
      });

      if (!userRole) return next(new AppError('No eres miembro de esta boda', 403));

      const nivelUsuario  = ROLE_HIERARCHY[userRole.role]  ?? 0;
      const nivelRequerido = ROLE_HIERARCHY[rolMinimo]     ?? 99;

      if (nivelUsuario < nivelRequerido) {
        return next(new AppError(
          `Se requiere al menos el rol "${rolMinimo}" para esta acción`,
          403,
        ));
      }

      (req as any).weddingRole = userRole.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};