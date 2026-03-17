import { z } from 'zod';

// ─── Params comunes ──────────────────────────────────────────────
export const weddingIdParamSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
});

export const guestIdParamSchema = z.object({
  params: z.object({
    guestId: z.string().uuid('ID de invitado inválido'),
  }),
});

// ─── Listar invitados (query filters) ───────────────────────────
export const listGuestsSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  query: z.object({
    rsvp_status: z.enum(['pending', 'confirmed', 'declined']).optional(),
    table_id: z.string().uuid().optional(),
    search: z.string().max(100).optional(),                 // busca por nombre o email
    include_companions: z.string().optional().transform(v => v !== 'false'), // default true
  }),
});

// ─── Crear invitado principal ────────────────────────────────────
export const createGuestSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  body: z.object({
    first_name: z.string().min(1, 'El nombre es requerido').max(100),
    last_name: z.string().max(100).optional(),
    email: z.string().email('Email inválido').optional(),
    phone: z.string().max(30).optional(),
    group: z.string().max(50).optional(),
    allergies: z.string().optional(),
    dietary_notes: z.string().optional(),
  }),
});

// ─── Crear acompañante (+1) ──────────────────────────────────────
export const createCompanionSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
    guestId: z.string().uuid('ID de invitado principal inválido'),
  }),
  body: z.object({
    first_name: z.string().min(1, 'El nombre es requerido').max(100),
    last_name: z.string().max(100).optional(),
    allergies: z.string().optional(),
    dietary_notes: z.string().optional(),
  }),
});

// ─── Actualizar invitado ─────────────────────────────────────────
export const updateGuestSchema = z.object({
  params: z.object({
    guestId: z.string().uuid('ID de invitado inválido'),
  }),
  body: z
    .object({
      first_name: z.string().min(1).max(100).optional(),
      last_name: z.string().max(100).nullable().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().max(30).nullable().optional(),
      group: z.string().max(50).nullable().optional(),
      allergies: z.string().nullable().optional(),
      dietary_notes: z.string().nullable().optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message: 'Debes enviar al menos un campo para actualizar',
    }),
});

// ─── Cambiar RSVP ────────────────────────────────────────────────
export const updateRsvpSchema = z.object({
  params: z.object({
    guestId: z.string().uuid('ID de invitado inválido'),
  }),
  body: z.object({
    rsvp_status: z.enum(['pending', 'confirmed', 'declined'], {
      message: 'Estado inválido: pending | confirmed | declined',
    }),
  }),
});

// ─── RSVP público (por invitation_code, sin auth) ────────────────
export const publicRsvpSchema = z.object({
  params: z.object({
    code: z.string().min(1, 'Código de invitación requerido'),
  }),
  body: z.object({
    rsvp_status: z.enum(['confirmed', 'declined'], {
      message: 'Estado inválido: confirmed | declined',
    }),
    allergies: z.string().optional(),
    dietary_notes: z.string().optional(),
  }),
});

// ─── Tipos inferidos ─────────────────────────────────────────────
export type ListGuestsQuery = z.infer<typeof listGuestsSchema>['query'];
export type CreateGuestInput = z.infer<typeof createGuestSchema>['body'];
export type CreateCompanionInput = z.infer<typeof createCompanionSchema>['body'];
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>['body'];
export type UpdateRsvpInput = z.infer<typeof updateRsvpSchema>['body'];
export type PublicRsvpInput = z.infer<typeof publicRsvpSchema>['body'];