import { Router } from 'express';
import tableController from '../controllers/table.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listTablesSchema,
  createTableSchema,
  updateTableSchema,
  assignGuestSchema,
  unassignGuestSchema,
  updatePositionSchema,
  tableIdParamSchema,
  weddingIdParamSchema,
} from '../schemas/table.schema';

// ─── Rutas anidadas bajo /api/weddings/:weddingId/tables ─────────
export const weddingTableRouter = Router({ mergeParams: true });
weddingTableRouter.use(authenticate);

weddingTableRouter.get('/', validate(listTablesSchema), tableController.getAll);
weddingTableRouter.post('/', validate(createTableSchema), tableController.create);

// ─── Rutas standalone bajo /api/tables ──────────────────────────
export const tableRouter = Router();
tableRouter.use(authenticate);

tableRouter.get('/:tableId', validate(tableIdParamSchema), tableController.getById);
tableRouter.patch('/:tableId', validate(updateTableSchema), tableController.update);
tableRouter.patch('/:tableId/position', validate(updatePositionSchema), tableController.updatePosition);
tableRouter.patch('/:tableId/assign', validate(assignGuestSchema), tableController.assignGuest);
tableRouter.patch('/:tableId/unassign/:guestId', validate(unassignGuestSchema), tableController.unassignGuest);
tableRouter.delete('/:tableId', validate(tableIdParamSchema), tableController.remove);