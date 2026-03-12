import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AppError } from './errorHandler.middleware';

export interface JwtPayload {
  userId: string;
  email: string;
  globalRole: string; // corresponde a role_global en la tabla users (GlobalRole enum: user | admin | superadmin)
}

// Extender Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticación requerido', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('Configuración de servidor inválida', 500);

    const decoded = jwt.verify(token, secret) as JwtPayload;


    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { status: true },
    });

    if (!user) throw new AppError('Usuario no encontrado', 401);

    if (user.status === 'suspended') {
      return next(new AppError('ACCOUNT_SUSPENDED', 403));
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError('Token inválido o expirado', 401));
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    if (!roles.includes(req.user.globalRole)) {
      return next(new AppError('No tienes permisos para esta acción', 403));
    }

    next();
  };
};