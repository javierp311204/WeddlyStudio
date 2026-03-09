import { Router } from 'express';
import inviteController from '../controllers/invite.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { acceptInviteSchema } from '../schemas/invite.schema';

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

export default router;