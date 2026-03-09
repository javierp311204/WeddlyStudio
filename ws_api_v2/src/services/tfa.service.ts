// FIX: import * as QRCode — la versión de @types/qrcode no tiene default export
import speakeasy    from 'speakeasy';
import * as QRCode  from 'qrcode';
import crypto       from 'crypto';
import bcrypt       from 'bcryptjs';
import jwt          from 'jsonwebtoken';
import prisma       from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { sendTfaResetEmail } from '../utils/email';

// Campos reales en schema.prisma:
//   two_factor_enabled  (boolean)
//   two_factor_secret   (string?)
//   tfa_reset_token     (string?)   ← añadidos con tfa_migration.sql
//   tfa_reset_expires   (DateTime?) ← añadidos con tfa_migration.sql
//
// IGNORAR los campos legacy tfa_enabled / tfa_secret que aparecen
// en la BD (son de una migración anterior, no están en el schema.prisma)

const APP_NAME     = 'Weddly Studio';
const TEMP_TTL_SEC = 5 * 60;
const RESET_TTL_MS = 30 * 60 * 1000;

// ─── Helpers JWT ──────────────────────────────────────────────────

export function signTempToken(userId: string): string {
  return jwt.sign(
    { userId, purpose: '2fa' },
    process.env.JWT_SECRET!,
    { expiresIn: TEMP_TTL_SEC } as any,
  );
}

function verifyTempToken(token: string): { userId: string } {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload.purpose !== '2fa') throw new Error();
    return { userId: payload.userId };
  } catch {
    throw new AppError('Token temporal inválido o expirado', 401);
  }
}

// ─── Estado actual ────────────────────────────────────────────────

export async function getStatus(userId: string): Promise<{ enabled: boolean }> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { two_factor_enabled: true },
  });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return { enabled: user.two_factor_enabled };
}

// ─── Setup: generar secreto + QR ─────────────────────────────────

export async function generateSetup(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { email: true, two_factor_enabled: true },
  });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  if (user.two_factor_enabled) throw new AppError('El 2FA ya está activado', 409);

  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${user.email})`, issuer: APP_NAME, length: 20,
  });

  await prisma.user.update({
    where: { id: userId },
    data:  { two_factor_secret: secret.base32 },
  });

  const otpauth_url = secret.otpauth_url!;
  // FIX: QRCode con import * as — llamar .toDataURL directamente
  const qr_data_url = await QRCode.toDataURL(otpauth_url);
  return { otpauth_url, qr_data_url };
}

// ─── Setup: confirmar y activar ───────────────────────────────────

export async function confirmSetup(userId: string, token: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { two_factor_secret: true, two_factor_enabled: true },
  });
  if (!user)                   throw new AppError('Usuario no encontrado', 404);
  if (user.two_factor_enabled) throw new AppError('El 2FA ya está activado', 409);
  if (!user.two_factor_secret) throw new AppError('Primero genera el QR', 400);

  const valid = speakeasy.totp.verify({
    secret: user.two_factor_secret, encoding: 'base32', token, window: 1,
  });
  if (!valid) throw new AppError('Código incorrecto. Inténtalo de nuevo.', 422);

  await prisma.user.update({
    where: { id: userId },
    data:  { two_factor_enabled: true },
  });
}

// ─── Desactivar ───────────────────────────────────────────────────

export async function disable2FA(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { password_hash: true, two_factor_enabled: true },
  });
  if (!user)                    throw new AppError('Usuario no encontrado', 404);
  if (!user.two_factor_enabled) throw new AppError('El 2FA no está activado', 400);

  const ok = await bcrypt.compare(password, user.password_hash!);
  if (!ok) throw new AppError('Contraseña incorrecta', 401);

  await prisma.user.update({
    where: { id: userId },
    data:  { two_factor_enabled: false, two_factor_secret: null },
  });
}

// ─── Login: verificar TOTP → tokens reales ───────────────────────

export async function verifyLogin(
  tempToken: string,
  totpCode:  string,
): Promise<{ access_token: string; refresh_token: string }> {
  const { userId } = verifyTempToken(tempToken);

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      two_factor_secret:  true,
      two_factor_enabled: true,
      email:              true,
      role_global:        true,
    },
  });
  if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
    throw new AppError('Estado 2FA inválido', 400);
  }

  const valid = speakeasy.totp.verify({
    secret: user.two_factor_secret, encoding: 'base32', token: totpCode, window: 1,
  });
  if (!valid) throw new AppError('Código incorrecto o expirado', 422);

  const payload       = { userId, email: user.email, globalRole: user.role_global };
  const accessExpiry  = process.env.JWT_EXPIRES_IN         || '15m';
  const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return {
    access_token:  jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: accessExpiry  } as any),
    refresh_token: jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: refreshExpiry } as any),
  };
}

// ─── Reset por email: solicitar ──────────────────────────────────

export async function requestReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, first_name: true, two_factor_enabled: true },
  });
  if (!user || !user.two_factor_enabled) return;

  const resetToken   = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + RESET_TTL_MS);

  // tfa_reset_token/expires son campos nuevos — cast any hasta que prisma generate los incluya
  await (prisma.user.update as any)({
    where: { id: user.id },
    data:  { tfa_reset_token: resetToken, tfa_reset_expires: resetExpires },
  });

  await sendTfaResetEmail({ to: email, firstName: user.first_name, token: resetToken });
}

// ─── Reset por email: confirmar ───────────────────────────────────

export async function confirmReset(resetToken: string): Promise<void> {
  const user = await (prisma.user.findFirst as any)({
    where:  { tfa_reset_token: resetToken },
    select: { id: true, tfa_reset_expires: true },
  });

  if (!user) throw new AppError('Token de reset inválido', 400);
  if (!user.tfa_reset_expires || user.tfa_reset_expires < new Date()) {
    throw new AppError('El token de reset ha expirado. Solicita uno nuevo.', 410);
  }

  await (prisma.user.update as any)({
    where: { id: user.id },
    data:  {
      two_factor_enabled: false,
      two_factor_secret:  null,
      tfa_reset_token:    null,
      tfa_reset_expires:  null,
    },
  });
}