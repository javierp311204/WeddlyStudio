import { Request, Response, NextFunction } from 'express';
import photoService from '../services/photo.service';
import { AppError } from '../middleware/errorHandler.middleware';

export class PhotoController {
  /**
   * GET /api/weddings/:weddingId/photos
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await photoService.getAll(
        req.params.weddingId,
        req.user!.userId,
        req.query as any,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/weddings/:weddingId/photos/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await photoService.getStats(req.params.weddingId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/photos/:photoId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await photoService.getById(req.params.photoId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/weddings/:weddingId/photos
   * Requiere singlePhoto middleware antes en la ruta
   */
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No se recibió ningún archivo', 400);

      const data = await photoService.upload(
        req.params.weddingId,
        req.user!.userId,
        req.file,
        req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/weddings/:weddingId/photos/batch
   * Requiere multiplePhotos middleware antes en la ruta
   */
  async uploadBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) throw new AppError('No se recibieron archivos', 400);

      const data = await photoService.uploadBatch(
        req.params.weddingId,
        req.user!.userId,
        files,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/photos/:photoId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await photoService.update(
        req.params.photoId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/photos/:photoId/moderate
   */
  async moderate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await photoService.moderate(
        req.params.photoId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/photos/:photoId
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await photoService.remove(req.params.photoId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new PhotoController();