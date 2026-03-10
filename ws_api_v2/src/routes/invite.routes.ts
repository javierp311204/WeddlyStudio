import { Router } from 'express';
import inviteController from '../controllers/invite.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { acceptInviteSchema, declineInviteSchema } from '../schemas/invite.schema';

const router = Router();

// ─── Públicas (sin auth) ──────────────────────────────────────
// Preview antes de login — el frontend la usa para mostrar info
router.get('/preview/:token', inviteController.previewInvite);

// ─── Requieren auth ───────────────────────────────────────────
router.post(
  '/accept/:token',
  authenticate,
  validate(acceptInviteSchema),
  inviteController.acceptInvite,
);

router.post(
  '/decline/:token',
  authenticate,
  validate(declineInviteSchema),
  inviteController.declineInvite,
);

export default router;