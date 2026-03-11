import { Router } from 'express';
import exportController from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';
import { minRoleGuard } from '../middleware/role.guard';

// ─── /api/weddings/:weddingId/export ─────────────────────────────
export const exportRouter = Router({ mergeParams: true });
exportRouter.use(authenticate);

/**
 * GET /api/weddings/:weddingId/export/ics
 * Disponible para cualquier miembro (guest+)
 */
exportRouter.get(
  '/ics',
  minRoleGuard('guest'),
  exportController.exportICS,
);

/**
 * GET /api/weddings/:weddingId/export/pdf-data
 * Disponible para cualquier miembro, pero el servicio verifica el plan
 */
exportRouter.get(
  '/pdf-data',
  minRoleGuard('guest'),
  exportController.exportPDFData,
);