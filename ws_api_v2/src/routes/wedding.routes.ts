import { Router } from 'express';
import weddingController from '../controllers/wedding.controller';
import inviteController  from '../controllers/invite.controller';
import { authenticate }  from '../middleware/auth.middleware';
import { roleGuard, minRoleGuard } from '../middleware/role.guard';
import { validate }      from '../middleware/validate.middleware';
import { sendInviteSchema, revokeInviteSchema, memberSchema } from '../schemas/invite.schema';
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
// Cualquier miembro puede ver la boda
router.get('/:id',
  validate(weddingIdSchema),
  minRoleGuard('guest'),
  weddingController.getById,
);
// Solo owner y co_organizer pueden editar
router.patch('/:id',
  validate(updateWeddingSchema),
  roleGuard('owner', 'co_organizer'),
  weddingController.update,
);
// Solo owner puede eliminar
router.delete('/:id',
  validate(weddingIdSchema),
  roleGuard('owner'),
  weddingController.remove,
);

// ─── Miembros ─────────────────────────────────────────────────────
// Solo owner puede añadir/eliminar miembros directamente
router.get('/:id/members',
  minRoleGuard('co_organizer'),
  inviteController.getMembers,
);

router.post('/:id/members',
  validate(addWeddingMemberSchema),
  roleGuard('owner'),
  weddingController.addMember,
);

// ─── Invitaciones ─────────────────────────────────────────────────
// Owner y co_organizer pueden ver y enviar invitaciones
router.get('/:id/invites',
  minRoleGuard('co_organizer'),
  inviteController.getInvites,
);
router.post('/:id/invites',
  validate(sendInviteSchema),
  roleGuard('owner', 'co_organizer'),
  inviteController.sendInvite,
);
// Solo owner puede revocar invitaciones y miembros
router.delete('/:id/invites/:inviteId',
  validate(revokeInviteSchema),
  roleGuard('owner'),
  inviteController.revokeInvite,
);
router.delete('/:id/members/:memberId',
  validate(memberSchema),
  roleGuard('owner'),
  inviteController.revokeMember,
);

router.patch('/:id/members/:memberId/role',
  validate(memberSchema),
  roleGuard('owner'),
  inviteController.updateMemberRole,
);

export default router;