import { Router } from 'express';
import guestController from '../controllers/guest.controller';
import { authenticate } from '../middleware/auth.middleware';
import { roleGuard, minRoleGuard } from '../middleware/role.guard';
import { validate } from '../middleware/validate.middleware';
import {
  listGuestsSchema, createGuestSchema, createCompanionSchema,
  updateGuestSchema, updateRsvpSchema, publicRsvpSchema,
  guestIdParamSchema, weddingIdParamSchema,
} from '../schemas/guest.schema';

// ─── /api/weddings/:weddingId/guests ─────────────────────────────
export const weddingGuestRouter = Router({ mergeParams: true });
weddingGuestRouter.use(authenticate);

// Cualquier miembro puede ver la lista
weddingGuestRouter.get('/',
  validate(listGuestsSchema),
  minRoleGuard('guest'),
  guestController.getAll,
);
// Solo owner, co_organizer y planner pueden exportar/crear
weddingGuestRouter.get('/export',
  validate(weddingIdParamSchema),
  roleGuard('owner', 'co_organizer', 'planner'),
  guestController.exportList,
);
weddingGuestRouter.post('/',
  validate(createGuestSchema),
  roleGuard('owner', 'co_organizer', 'planner'),
  guestController.create,
);
weddingGuestRouter.post('/:guestId/companions',
  validate(createCompanionSchema),
  roleGuard('owner', 'co_organizer', 'planner'),
  guestController.createCompanion,
);

// ─── /api/guests ──────────────────────────────────────────────────
// Nota: estos endpoints no tienen weddingId en la ruta — el roleGuard
// no aplica aquí directamente; la validación de pertenencia la hace
// el service internamente (assertWeddingAccess). Se deja solo authenticate.
export const guestRouter = Router();
guestRouter.use(authenticate);

guestRouter.get('/:guestId',      validate(guestIdParamSchema), guestController.getById);
guestRouter.patch('/:guestId',    validate(updateGuestSchema),  guestController.update);
guestRouter.patch('/:guestId/rsvp', validate(updateRsvpSchema), guestController.updateRsvp);
guestRouter.delete('/:guestId',   validate(guestIdParamSchema), guestController.remove);

// ─── /api/rsvp — público ─────────────────────────────────────────
export const rsvpRouter = Router();
rsvpRouter.get('/:code/info', guestController.getRsvpInfo);
rsvpRouter.patch('/:code', validate(publicRsvpSchema), guestController.publicRsvp);