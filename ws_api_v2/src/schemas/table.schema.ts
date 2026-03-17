import { z } from 'zod';

// Shape válidos — sincronizado con el enum GuestShape de Prisma
const SHAPE_VALUES = ['round', 'rectangular', 'presidential'] as const;
type Shape = typeof SHAPE_VALUES[number];

// ─── Params comunes ──────────────────────────────────────────────
export const weddingIdParamSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
});

export const tableIdParamSchema = z.object({
  params: z.object({
    tableId: z.string().uuid('ID de mesa inválido'),
  }),
});

// ─── Listar mesas ────────────────────────────────────────────────
export const listTablesSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  query: z.object({
    include_guests: z
      .enum(['true', 'false'])
      .optional()
      .default('true')
      .transform((v) => v !== 'false'),
  }),
});

// ─── Crear mesa ──────────────────────────────────────────────────
export const createTableSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  body: z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100),
    shape: z
      .enum(SHAPE_VALUES, {
        message: 'Shape inválido: round | rectangular | presidential',
      })
      .optional()
      .default('round'),
    max_capacity: z
      .number()
      .int()
      .min(1, 'La capacidad mínima es 1')
      .max(50)
      .optional()
      .default(10),
    pos_x: z.number().min(-5000).max(10000).optional().default(600),
    pos_y: z.number().min(-5000).max(10000).optional().default(400),
    angle: z.number().min(0).max(360).optional().default(0),
  }),
});

// ─── Actualizar mesa ─────────────────────────────────────────────
export const updateTableSchema = z.object({
  params: z.object({
    tableId: z.string().uuid('ID de mesa inválido'),
  }),
  body: z
    .object({
      name:         z.string().min(1).max(100).optional(),
      shape:        z.enum(SHAPE_VALUES).optional(),
      max_capacity: z.number().int().min(1).max(50).optional(),
      pos_x:        z.number().min(-5000).max(10000).optional(),
      pos_y:        z.number().min(-5000).max(10000).optional(),
      angle:        z.number().min(0).max(360).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Debes enviar al menos un campo para actualizar',
    }),
});

// ─── Asignar invitado a mesa ─────────────────────────────────────
export const assignGuestSchema = z.object({
  params: z.object({
    tableId: z.string().uuid('ID de mesa inválido'),
  }),
  body: z.object({
    guest_id:    z.string().uuid('ID de invitado inválido'),
    seat_number: z.number().int().min(1).optional(),
  }),
});

// ─── Desasignar invitado de mesa ─────────────────────────────────
export const unassignGuestSchema = z.object({
  params: z.object({
    tableId:  z.string().uuid('ID de mesa inválido'),
    guestId:  z.string().uuid('ID de invitado inválido'),
  }),
});

// ─── Actualizar posición (drag & drop) ──────────────────────────
export const updatePositionSchema = z.object({
  params: z.object({
    tableId: z.string().uuid('ID de mesa inválido'),
  }),
  body: z.object({
    pos_x: z.number().min(-5000).max(10000).optional(),
    pos_y: z.number().min(-5000).max(10000).optional(),
    angle: z.number().min(0).max(360).optional(),
  }),
});

// ─── Tipos inferidos ─────────────────────────────────────────────
export type CreateTableInput    = z.infer<typeof createTableSchema>['body'];
export type UpdateTableInput    = z.infer<typeof updateTableSchema>['body'];
export type AssignGuestInput    = z.infer<typeof assignGuestSchema>['body'];
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>['body'];
export type ListTablesQuery     = z.infer<typeof listTablesSchema>['query'];