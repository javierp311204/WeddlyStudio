import crypto from 'crypto';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { sendVerificationEmail } from '../utils/email';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  UpdateProfileInput,   // ✅ importado
} from '../schemas/auth.schema';

export class AuthService {

  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new AppError('El email ya está registrado', 409);

    const hashedPassword      = await hashPassword(data.password);
    const verificationToken   = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        first_name: data.first_name, last_name: data.last_name,
        nickname: data.nickname, email: data.email, password_hash: hashedPassword,
        phone: data.phone, gender: data.gender, language: data.language ?? 'es',
        role_global: 'user',
        email_verification_token:   verificationToken,
        email_verification_expires: verificationExpires,
        email_verified: false,
      },
      select: { id: true, first_name: true, last_name: true, email: true, phone: true, role_global: true, created_at: true },
    });

    sendVerificationEmail({ to: data.email, firstName: data.first_name, verificationToken })
      .catch(err => console.error('[Auth] Error enviando email de verificación:', err));

    const tokenPayload = { userId: user.id, email: user.email, globalRole: user.role_global };

    return {
      user,
      access_token:  generateAccessToken(tokenPayload),
      refresh_token: generateRefreshToken(tokenPayload),
      message: 'Cuenta creada. Revisa tu email para verificar tu cuenta.',
    };
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { email_verification_token: token, email_verified: false },
    });

    if (!user) throw new AppError('Token de verificación inválido', 400);
    if (!user.email_verification_expires || user.email_verification_expires < new Date()) {
      throw new AppError('El token de verificación ha expirado. Solicita uno nuevo.', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email_verified: true, email_verification_token: null, email_verification_expires: null },
    });

    return { message: 'Email verificado correctamente' };
  }

  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.email_verified) {
      return { message: 'Si el email existe y no está verificado, recibirás un nuevo enlace.' };
    }

    const verificationToken   = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { email_verification_token: verificationToken, email_verification_expires: verificationExpires },
    });

    sendVerificationEmail({ to: user.email, firstName: user.first_name, verificationToken })
      .catch(err => console.error('[Auth] Error reenviando verificación:', err));

    return { message: 'Si el email existe y no está verificado, recibirás un nuevo enlace.' };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password_hash) throw new AppError('Credenciales inválidas', 401);

    const isValidPassword = await comparePassword(data.password, user.password_hash);
    if (!isValidPassword) throw new AppError('Credenciales inválidas', 401);

    const emailWarning = !user.email_verified
      ? 'Te recomendamos verificar tu email para acceder a todas las funciones.'
      : undefined;

    const tokenPayload = { userId: user.id, email: user.email, globalRole: user.role_global };

    return {
      user: {
        id: user.id, first_name: user.first_name, last_name: user.last_name,
        email: user.email, phone: user.phone, role_global: user.role_global,
        avatar_url: user.avatar_url, email_verified: user.email_verified,
      },
      access_token:  generateAccessToken(tokenPayload),
      refresh_token: generateRefreshToken(tokenPayload),
      ...(emailWarning && { warning: emailWarning }),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = verifyToken(refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role_global: true },
      });
      if (!user) throw new AppError('Usuario no encontrado', 404);

      const tokenPayload = { userId: user.id, email: user.email, globalRole: user.role_global };
      return {
        access_token:  generateAccessToken(tokenPayload),
        refresh_token: generateRefreshToken(tokenPayload),
      };
    } catch {
      throw new AppError('Refresh token inválido o expirado', 401);
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, first_name: true, last_name: true, nickname: true,
        email: true, phone: true, gender: true, language: true,
        role_global: true, avatar_url: true, email_verified: true, created_at: true,
        wedding_roles: {
          select: {
            role: true,
            wedding: { select: { id: true, name: true, wedding_date: true, status: true, location_name: true, plan_type: true } },
          },
        },
      },
    });

    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  }

  // ✅ PATCH /api/auth/me — actualizar perfil
  async updateProfile(userId: string, data: UpdateProfileInput) {
    let emailFields: Record<string, unknown> = {};

    // Si el email cambia: resetear verificación + enviar nuevo token
    if (data.email) {
      const verificationToken   = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      emailFields = {
        email:                      data.email,
        email_verified:             false,
        email_verification_token:   verificationToken,
        email_verification_expires: verificationExpires,
      };

      sendVerificationEmail({ to: data.email, firstName: data.first_name, verificationToken })
        .catch(err => console.error('[Auth] Error enviando verificación al cambiar email:', err));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name: data.first_name,
        last_name:  data.last_name,
        nickname:   data.nickname ?? null,
        phone:      data.phone    ?? null,
        gender:     data.gender   ?? null,
        language:   data.language,
        ...emailFields,
      },
      select: {
        id: true, first_name: true, last_name: true, nickname: true,
        email: true, phone: true, gender: true, language: true,
        avatar_url: true, email_verified: true, role_global: true,
      },
    });

    return user;
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password_hash) throw new AppError('Usuario no encontrado', 404);

    const isValid = await comparePassword(data.current_password, user.password_hash);
    if (!isValid) throw new AppError('La contraseña actual es incorrecta', 401);

    const newHash = await hashPassword(data.new_password);
    await prisma.user.update({ where: { id: userId }, data: { password_hash: newHash } });

    return { message: 'Contraseña actualizada correctamente' };
  }
}

export default new AuthService();