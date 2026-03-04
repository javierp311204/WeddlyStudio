import { Router } from 'express';
import guestController from '../controllers/guest.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listGuestsSchema,
  createGuestSchema,
  createCompanionSchema,
  updateGuestSchema,
  updateRsvpSchema,
  publicRsvpSchema,
  guestIdParamSchema,
  weddingIdParamSchema,
} from '../schemas/guest.schema';

// ─── Rutas anidadas bajo /api/weddings/:weddingId/guests ─────────
export const weddingGuestRouter = Router({ mergeParams: true });
weddingGuestRouter.use(authenticate);

weddingGuestRouter.get('/', validate(listGuestsSchema), guestController.getAll);
weddingGuestRouter.get('/export', validate(weddingIdParamSchema), guestController.exportList);
weddingGuestRouter.post('/', validate(createGuestSchema), guestController.create);
weddingGuestRouter.post(
  '/:guestId/companions',
  validate(createCompanionSchema),
  guestController.createCompanion,
);

// ─── Rutas standalone bajo /api/guests ──────────────────────────
export const guestRouter = Router();
guestRouter.use(authenticate);

guestRouter.get('/:guestId', validate(guestIdParamSchema), guestController.getById);
guestRouter.patch('/:guestId', validate(updateGuestSchema), guestController.update);
guestRouter.patch('/:guestId/rsvp', validate(updateRsvpSchema), guestController.updateRsvp);
guestRouter.delete('/:guestId', validate(guestIdParamSchema), guestController.remove);

// ─── Ruta pública RSVP (sin auth) bajo /api/rsvp ────────────────
export const rsvpRouter = Router();
rsvpRouter.patch('/:code', validate(publicRsvpSchema), guestController.publicRsvp);