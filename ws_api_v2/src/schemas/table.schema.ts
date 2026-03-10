import { z } from 'zod';

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
    // FIX: enum explícito en lugar de transform(v => v !== 'false')
    // Antes cualquier string que no fuera 'false' devolvía true (ej: 'banana' → true)
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
      .enum(['round', 'rectangular'] as const, {
        message: 'Shape inválido: round | rectangular',
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
    // FIX: el canvas usa píxeles directos (canvasWidth=1200, canvasHeight=800).
    // El límite anterior de max(100) rechazaba cualquier posición real del canvas
    // con error 400. Ahora se acepta hasta 5000px por si el canvas escala.
    pos_x: z.number().min(0).max(5000).optional().default(600),
    pos_y: z.number().min(0).max(5000).optional().default(400),
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
      shape:        z.enum(['round', 'rectangular'] as const).optional(),
      max_capacity: z.number().int().min(1).max(50).optional(),
      // FIX: mismo ajuste de rango que en createTableSchema
      pos_x:        z.number().min(0).max(5000).optional(),
      pos_y:        z.number().min(0).max(5000).optional(),
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
    // FIX: mismo ajuste de rango
    pos_x: z.number().min(0).max(5000),
    pos_y: z.number().min(0).max(5000),
  }),
});

// ─── Tipos inferidos ─────────────────────────────────────────────
export type CreateTableInput    = z.infer<typeof createTableSchema>['body'];
export type UpdateTableInput    = z.infer<typeof updateTableSchema>['body'];
export type AssignGuestInput    = z.infer<typeof assignGuestSchema>['body'];
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>['body'];
export type ListTablesQuery     = z.infer<typeof listTablesSchema>['query'];