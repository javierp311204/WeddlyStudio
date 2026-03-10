import { Router } from 'express';
import tableController from '../controllers/table.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard, minRoleGuard } from '../middleware/role.guard';
import { validate } from '../middleware/validate.middleware';
import {
  listTablesSchema,
  createTableSchema,
  updateTableSchema,
  assignGuestSchema,
  unassignGuestSchema,
  updatePositionSchema,
  tableIdParamSchema,
} from '../schemas/table.schema';

// ─── /api/weddings/:weddingId/tables ─────────────────────────────
// Rutas que SÍ tienen weddingId en params → roleGuard funciona
export const weddingTableRouter = Router({ mergeParams: true });
weddingTableRouter.use(authenticate);

weddingTableRouter.get(
  '/',
  validate(listTablesSchema),
  minRoleGuard('guest'),
  tableController.getAll,
);

weddingTableRouter.post(
  '/',
  validate(createTableSchema),
  roleGuard('owner', 'co_organizer', 'planner'),
  tableController.create,
);

// ─── /api/tables/:tableId ────────────────────────────────────────
// Rutas que NO tienen weddingId en params → roleGuard no aplica aquí.
// El control de acceso se delega a assertTableAccess() en el service,
// que verifica que el usuario pertenece a la boda de la mesa.
// El control de rol queda pendiente de un tableRoleGuard dedicado.
export const tableRouter = Router();
tableRouter.use(authenticate);

tableRouter.get(
  '/:tableId',
  validate(tableIdParamSchema),
  tableController.getById,
);

tableRouter.patch(
  '/:tableId',
  validate(updateTableSchema),
  tableController.update,
);

tableRouter.patch(
  '/:tableId/position',
  validate(updatePositionSchema),
  tableController.updatePosition,
);

tableRouter.patch(
  '/:tableId/assign',
  validate(assignGuestSchema),
  tableController.assignGuest,
);

tableRouter.patch(
  '/:tableId/unassign/:guestId',
  validate(unassignGuestSchema),
  tableController.unassignGuest,
);

tableRouter.delete(
  '/:tableId',
  validate(tableIdParamSchema),
  tableController.remove,
);