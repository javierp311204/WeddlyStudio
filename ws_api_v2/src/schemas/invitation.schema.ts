import { z } from 'zod';

// ─── Params comunes ──────────────────────────────────────────────
export const weddingIdParamSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
});

export const invitationIdParamSchema = z.object({
  params: z.object({
    invitationId: z.string().uuid('ID de invitación inválido'),
  }),
});

// ─── Crear invitación ────────────────────────────────────────────
export const createInvitationSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  body: z.object({
    template_type: z.enum(
      ['elegant', 'modern', 'rustic', 'minimalist'] as const,
      { message: 'Template inválido: elegant | modern | rustic | minimalist' },
    ).optional().default('elegant'),
    background: z.string().max(100).optional(),
    primary_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido, usa formato hex #RRGGBB')
      .optional(),
    secondary_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido, usa formato hex #RRGGBB')
      .optional(),
    custom_text: z.string().max(2000).optional(),
  }),
});

// ─── Actualizar invitación ───────────────────────────────────────
export const updateInvitationSchema = z.object({
  params: z.object({
    invitationId: z.string().uuid('ID de invitación inválido'),
  }),
  body: z
    .object({
      template_type: z.enum(['elegant', 'modern', 'rustic', 'minimalist'] as const).optional(),
      background: z.string().max(100).nullable().optional(),
      primary_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido, usa formato hex #RRGGBB')
        .nullable()
        .optional(),
      secondary_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido, usa formato hex #RRGGBB')
        .nullable()
        .optional(),
      custom_text: z.string().max(2000).nullable().optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message: 'Debes enviar al menos un campo para actualizar',
    }),
});

// ─── Envío masivo ────────────────────────────────────────────────
export const sendInvitationSchema = z.object({
  params: z.object({
    invitationId: z.string().uuid('ID de invitación inválido'),
  }),
  body: z.object({
    guest_ids: z
      .array(z.string().uuid('ID de invitado inválido'))
      .min(1, 'Debes seleccionar al menos un invitado')
      .max(500, 'Máximo 500 invitados por envío')
      .optional(),
    send_to_all: z.boolean().optional().default(false),
    // Si send_to_all=true se ignora guest_ids y se envía a todos los guests con email
  }),
}).refine(
  data => data.body.send_to_all || (data.body.guest_ids && data.body.guest_ids.length > 0),
  { message: 'Debes indicar guest_ids o activar send_to_all', path: ['body'] },
);

// ─── Listar envíos ───────────────────────────────────────────────
export const listSendsSchema = z.object({
  params: z.object({
    invitationId: z.string().uuid('ID de invitación inválido'),
  }),
  query: z.object({
    status: z.enum(['sent', 'failed'] as const).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  }),
});

// ─── Tipos inferidos ─────────────────────────────────────────────
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>['body'];
export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>['body'];
export type SendInvitationInput = z.infer<typeof sendInvitationSchema>['body'];
export type ListSendsQuery = z.infer<typeof listSendsSchema>['query'];