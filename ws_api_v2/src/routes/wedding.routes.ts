import { Router } from 'express';
import weddingController from '../controllers/wedding.controller';
import inviteController  from '../controllers/invite.controller';
import { authenticate }  from '../middleware/auth.middleware';
import { roleGuard, minRoleGuard } from '../middleware/role.guard';
import { validate }      from '../middleware/validate.middleware';
import { sendInviteSchema, revokeInviteSchema, memberSchema } from '../schemas/invite.schema';
import { weddingStatusGuard } from '../middleware/weddingStatus.guard';
import {
  createWeddingSchema,
  updateWeddingSchema,
  weddingIdSchema,
  addWeddingMemberSchema,
} from '../schemas/wedding.schema';

const router = Router();
router.use(authenticate);

// ─── Sin parámetro ────────────────────────────────────────────────
router.get('/',           weddingController.getAll);
router.get('/can-create', weddingController.canCreate);
router.post('/', validate(createWeddingSchema), weddingController.create);

// ─── CRUD con :id ─────────────────────────────────────────────────
router.get('/:id',
  validate(weddingIdSchema),
  minRoleGuard('guest'),
  weddingController.getById,
);
router.patch('/:id',
  validate(updateWeddingSchema),
  weddingStatusGuard,
  roleGuard('owner', 'co_organizer'),
  weddingController.update,
);
router.delete('/:id',
  validate(weddingIdSchema),
  weddingStatusGuard,
  roleGuard('owner'),
  weddingController.remove,
);

// ─── Miembros ─────────────────────────────────────────────────────
router.get('/:id/members',
  minRoleGuard('co_organizer'),
  inviteController.getMembers,
);
router.post('/:id/members',
  validate(addWeddingMemberSchema),
  weddingStatusGuard,
  roleGuard('owner'),
  weddingController.addMember,
);
router.delete('/:id/members/:memberId',
  validate(memberSchema),
  weddingStatusGuard,
  roleGuard('owner'),
  inviteController.revokeMember,
);
router.patch('/:id/members/:memberId/role',
  validate(memberSchema),
  weddingStatusGuard,
  roleGuard('owner'),
  inviteController.updateMemberRole,
);

// ─── Invitaciones ─────────────────────────────────────────────────
router.get('/:id/invites',
  minRoleGuard('co_organizer'),
  inviteController.getInvites,
);
router.post('/:id/invites',
  validate(sendInviteSchema),
  weddingStatusGuard,
  roleGuard('owner', 'co_organizer'),
  inviteController.sendInvite,
);
router.delete('/:id/invites/:inviteId',
  validate(revokeInviteSchema),
  weddingStatusGuard,
  roleGuard('owner'),
  inviteController.revokeInvite,
);

export default router;