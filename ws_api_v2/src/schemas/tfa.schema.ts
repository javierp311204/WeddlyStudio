import { z } from 'zod';

// ─── Setup: verificar TOTP para confirmar activación ──────────
export const tfaVerifySetupSchema = z.object({
  body: z.object({
    token: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d{6}$/, 'Solo dígitos'),
  }),
});

// ─── Login con 2FA — verificar código TOTP ────────────────────
export const tfaLoginSchema = z.object({
  body: z.object({
    temp_token: z.string().min(1, 'Token temporal requerido'),
    token:      z.string().length(6).regex(/^\d{6}$/),
  }),
});

// ─── Desactivar 2FA — requiere contraseña actual ──────────────
export const tfaDisableSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Contraseña requerida para desactivar 2FA'),
  }),
});

// ─── Reset 2FA por email — solicitar ─────────────────────────
export const tfaResetRequestSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
  }),
});

// ─── Reset 2FA por email — confirmar con token ───────────────
export const tfaResetConfirmSchema = z.object({
  body: z.object({
    reset_token: z.string().min(1, 'Token de reset requerido'),
  }),
});

export type TfaVerifySetupInput  = z.infer<typeof tfaVerifySetupSchema>['body'];
export type TfaLoginInput        = z.infer<typeof tfaLoginSchema>['body'];
export type TfaDisableInput      = z.infer<typeof tfaDisableSchema>['body'];
export type TfaResetRequestInput = z.infer<typeof tfaResetRequestSchema>['body'];
export type TfaResetConfirmInput = z.infer<typeof tfaResetConfirmSchema>['body'];