import { z } from 'zod';

export const createWeddingSchema = z.object({
  body: z.object({
    name:             z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
    // FIX: wedding_date opcional — el onboarding puede no enviarlo
    wedding_date:     z.string().datetime({ message: 'Fecha inválida, usa formato ISO 8601' }).optional(),
    location_name:    z.string().max(200).optional(),
    address:          z.string().max(500).optional(),
    dress_code:       z.string().max(200).optional(),
    menu_description: z.string().optional(),
    rsvp_deadline:    z.string().datetime().optional(),
  }),
});

export const updateWeddingSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de boda inválido') }),
  body: z.object({
    name:             z.string().min(2).max(200).optional(),
    wedding_date:     z.string().datetime().optional(),
    location_name:    z.string().max(200).optional(),
    address:          z.string().max(500).optional(),
    dress_code:       z.string().max(200).optional(),
    menu_description: z.string().optional(),
    rsvp_deadline:    z.string().datetime().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  }),
});

export const weddingIdSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de boda inválido') }),
});

export const addWeddingMemberSchema = z.object({
  params: z.object({ id: z.string().uuid('ID de boda inválido') }),
  body: z.object({
    user_id: z.string().uuid('ID de usuario inválido'),
    role: z.enum(['bride', 'groom', 'planner', 'guest'] as const, {
      message: 'Rol inválido: bride | groom | planner | guest',
    }),
  }),
});

export type CreateWeddingInput    = z.infer<typeof createWeddingSchema>['body'];
export type UpdateWeddingInput    = z.infer<typeof updateWeddingSchema>['body'];
export type AddWeddingMemberInput = z.infer<typeof addWeddingMemberSchema>['body'];