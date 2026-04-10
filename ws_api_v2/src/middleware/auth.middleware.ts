import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AppError } from './errorHandler.middleware';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

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

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // 1️⃣ Primero busca en cookie HttpOnly
  let token = req.cookies?.access_token;

  // 2️⃣ Si no hay cookie, busca en header Authorization (fallback)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
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