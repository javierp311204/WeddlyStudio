import { Router } from 'express';
import tableController from '../controllers/table.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard, minRoleGuard } from '../middleware/role.guard';
import { validate } from '../middleware/validate.middleware';
import {
  listTablesSchema, createTableSchema, updateTableSchema,
  assignGuestSchema, unassignGuestSchema, updatePositionSchema,
  tableIdParamSchema, weddingIdParamSchema,
} from '../schemas/table.schema';

// ─── /api/weddings/:weddingId/tables ─────────────────────────────
export const weddingTableRouter = Router({ mergeParams: true });
weddingTableRouter.use(authenticate);

// Cualquier miembro puede ver mesas
weddingTableRouter.get('/',
  validate(listTablesSchema),
  minRoleGuard('guest'),
  tableController.getAll,
);
// Solo owner, co_organizer y planner pueden crear/gestionar mesas
weddingTableRouter.post('/',
  validate(createTableSchema),
  roleGuard('owner', 'co_organizer', 'planner'),
  tableController.create,
);

// ─── /api/tables ──────────────────────────────────────────────────
export const tableRouter = Router();
tableRouter.use(authenticate);

tableRouter.get('/:tableId',    validate(tableIdParamSchema),    tableController.getById);
tableRouter.patch('/:tableId',  validate(updateTableSchema),     tableController.update);
tableRouter.patch('/:tableId/position', validate(updatePositionSchema), tableController.updatePosition);
tableRouter.patch('/:tableId/assign',   validate(assignGuestSchema),   tableController.assignGuest);
tableRouter.patch('/:tableId/unassign/:guestId', validate(unassignGuestSchema), tableController.unassignGuest);
tableRouter.delete('/:tableId', validate(tableIdParamSchema),    tableController.remove);