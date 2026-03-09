import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { AppError } from '../middleware/errorHandler.middleware';

export class UserController {

  /**
   * POST /api/users/me/avatar
   * Requiere singlePhoto middleware (campo "avatar")
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No se recibió ningún archivo', 400);

      const data = await userService.updateAvatar(req.user!.userId, req.file);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/users/me
   * Soft delete de la cuenta del usuario autenticado
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await userService.deleteAccount(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new UserController();