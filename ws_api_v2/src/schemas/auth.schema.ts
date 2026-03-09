import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(100),
    nickname: z.string().max(50).optional(),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    phone: z.string().max(30).optional(),
    gender: z.string().max(20).optional(),
    language: z.string().max(10).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token requerido'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, 'Contraseña actual requerida'),
    new_password: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    first_name: z.string().min(1).max(100),
    last_name:  z.string().min(1).max(100),
    nickname:   z.string().max(50).optional().nullable(),
    email:      z.string().email('Email inválido').optional(),
    phone:      z.string().max(30).optional().nullable(),
    gender:     z.enum(['male', 'female', 'non_binary', 'prefer_not']).optional().nullable(),
    language:   z.enum(['es', 'en', 'ca', 'fr']).default('es'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type UpdateProfileInput  = z.infer<typeof updateProfileSchema>['body'];