import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;

    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: `Ya existe un registro con ese ${prismaErr.meta?.target?.join(', ')}`,
      });
    }

    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado',
      });
    }
  }

  console.error('Error no controlado:', err);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
};