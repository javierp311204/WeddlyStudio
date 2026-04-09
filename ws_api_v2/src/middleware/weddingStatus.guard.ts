import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from './errorHandler.middleware';

export const weddingStatusGuard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // GET nunca se bloquea
  if (req.method === 'GET') return next();

  const weddingId = req.params.id;
  if (!weddingId) return next();

  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { status: true, created_by: true },
    });

    if (!wedding) return next(new AppError('Boda no encontrada', 404));

    const isOwnerDeleting = req.method === 'DELETE' && wedding.created_by === req.user?.userId;
    if (isOwnerDeleting) return next();

    if (wedding.status === 'readonly') {
      return next(
        new AppError(
          'WEDDING_READONLY: Esta boda está en modo lectura. Revisa tu suscripción.',
          403,
        ),
      );
    }

    if (wedding.status === 'archived') {
      return next(
        new AppError(
          'WEDDING_ARCHIVED: Esta boda está archivada y no admite cambios.',
          403,
        ),
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};