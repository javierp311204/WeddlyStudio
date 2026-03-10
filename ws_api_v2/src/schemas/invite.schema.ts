import { z } from 'zod';

export const sendInviteSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de boda inválido') }),
  body: z.object({
    email: z.string().email('Email inválido'),
    role: z.enum(['co_organizer', 'planner', 'guest'] as const, {
      message: 'Rol inválido: co_organizer | planner | guest',
    }),
  }),
});

export const acceptInviteSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
});

// ─── Revocar invitación (:inviteId) ──────────────────────────
export const revokeInviteSchema = z.object({
  params: z.object({
    id:       z.string().uuid('ID de boda inválido'),
    inviteId: z.string().uuid('ID de invitación inválido'),
  }),
});

// ─── Revocar / editar miembro (:memberId) ────────────────────
export const memberSchema = z.object({
  params: z.object({
    id:       z.string().uuid('ID de boda inválido'),
    memberId: z.string().uuid('ID de miembro inválido'),
  }),
});

export const declineInviteSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
});

export type SendInviteInput = z.infer<typeof sendInviteSchema>['body'];