import { z } from 'zod';

// ─── Params comunes ──────────────────────────────────────────────
export const weddingIdParamSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
});

export const photoIdParamSchema = z.object({
  params: z.object({
    photoId: z.string().uuid('ID de foto inválido'),
  }),
});

// ─── Listar fotos ────────────────────────────────────────────────
export const listPhotosSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected'] as const).optional(),
    uploaded_by_me: z.string().optional().transform(v => v === 'true'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

// ─── Upload foto ─────────────────────────────────────────────────
// El archivo viene como multipart/form-data, Zod solo valida los campos de texto
export const uploadPhotoSchema = z.object({
  params: z.object({
    weddingId: z.string().uuid('ID de boda inválido'),
  }),
  body: z.object({
    caption: z.string().max(500).optional(),
  }),
});

// ─── Actualizar caption ──────────────────────────────────────────
export const updatePhotoSchema = z.object({
  params: z.object({
    photoId: z.string().uuid('ID de foto inválido'),
  }),
  body: z.object({
    caption: z.string().max(500).nullable(),
  }),
});

// ─── Moderar foto ────────────────────────────────────────────────
export const moderatePhotoSchema = z.object({
  params: z.object({
    photoId: z.string().uuid('ID de foto inválido'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected', 'deleted'], {
      message: 'Estado inválido: approved | rejected | deleted',
    }),
  }),
});

// ─── Tipos inferidos ─────────────────────────────────────────────
export type ListPhotosQuery = z.infer<typeof listPhotosSchema>['query'];
export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>['body'];
export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>['body'];
export type ModeratePhotoInput = z.infer<typeof moderatePhotoSchema>['body'];