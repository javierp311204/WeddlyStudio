import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.middleware';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Tipo de archivo no permitido: ${file.mimetype}. Usa JPEG, PNG, WebP o HEIC.`, 400) as any);
    }
  },
});

// Campo "photo" — fotos de boda (álbum)
export const singlePhoto = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return next(new AppError(`El archivo supera el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400));
    return next(err);
  });
};

// Campo "photos" — subida múltiple (álbum batch)
export const multiplePhotos = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware.array('photos', 10)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return next(new AppError(`Un archivo supera el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400));
    if (err.code === 'LIMIT_UNEXPECTED_FILE')
      return next(new AppError('Máximo 10 fotos por subida', 400));
    return next(err);
  });
};

// Campo "avatar" — foto de perfil de usuario
export const singleAvatar = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return next(new AppError(`El archivo supera el límite de ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400));
    return next(err);
  });
};