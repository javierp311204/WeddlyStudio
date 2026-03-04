import { Router } from 'express';
import invitationController from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createInvitationSchema,
  updateInvitationSchema,
  sendInvitationSchema,
  listSendsSchema,
  invitationIdParamSchema,
  weddingIdParamSchema,
} from '../schemas/invitation.schema';

// ─── Rutas anidadas bajo /api/weddings/:weddingId/invitations ────
export const weddingInvitationRouter = Router({ mergeParams: true });
weddingInvitationRouter.use(authenticate);

weddingInvitationRouter.get('/', validate(weddingIdParamSchema), invitationController.getAll);
weddingInvitationRouter.post('/', validate(createInvitationSchema), invitationController.create);

// ─── Rutas standalone bajo /api/invitations ──────────────────────
export const invitationRouter = Router();
invitationRouter.use(authenticate);

invitationRouter.get('/:invitationId', validate(invitationIdParamSchema), invitationController.getById);
invitationRouter.patch('/:invitationId', validate(updateInvitationSchema), invitationController.update);
invitationRouter.delete('/:invitationId', validate(invitationIdParamSchema), invitationController.remove);

// ─── Envío ───────────────────────────────────────────────────────
invitationRouter.post('/:invitationId/send', validate(sendInvitationSchema), invitationController.send);
invitationRouter.post('/:invitationId/resend/:guestId', validate(invitationIdParamSchema), invitationController.resend);

// ─── Historial de envíos ─────────────────────────────────────────
invitationRouter.get('/:invitationId/sends', validate(listSendsSchema), invitationController.getSends);