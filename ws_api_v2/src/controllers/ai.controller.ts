import { Request, Response, NextFunction } from 'express';
import aiService from '../services/ai.service';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';

// Helper para obtener el plan activo del usuario sobre una boda
async function getActivePlan(userId: string, weddingId: string): Promise<string> {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId, deleted_at: null },
  });
  if (!wedding) throw new AppError('Boda no encontrada', 404);

  // Verificar que el usuario tiene acceso
  const hasAccess =
    wedding.created_by === userId ||
    (await prisma.userWeddingRole.count({ where: { user_id: userId, wedding_id: weddingId } })) > 0;

  if (!hasAccess) throw new AppError('No tienes acceso a esta boda', 403);

  return wedding.plan_type; // 'free' | 'one_time' | 'subscription'
}

export class AiController {

  /**
   * POST /api/ai/:weddingId/chat
   * Body: { message: string, history?: [{role, content}] }
   */
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { weddingId } = req.params;
      const { message, history = [] } = req.body;
      const userId = req.user!.userId;

      if (!message?.trim()) {
        throw new AppError('El mensaje no puede estar vacío', 400);
      }

      const planType = await getActivePlan(userId, weddingId);
      const result   = await aiService.chat(userId, weddingId, planType, message, history);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/:weddingId/suggest-tasks
   */
  async suggestTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { weddingId } = req.params;
      const userId        = req.user!.userId;

      const planType = await getActivePlan(userId, weddingId);
      const result   = await aiService.suggestTasks(userId, weddingId, planType);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/:weddingId/suggest-seating
   */
  async suggestSeating(req: Request, res: Response, next: NextFunction) {
    try {
      const { weddingId } = req.params;
      const userId        = req.user!.userId;

      const planType = await getActivePlan(userId, weddingId);
      const result   = await aiService.suggestSeating(userId, weddingId, planType);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/:weddingId/suggest-table/:guestId
   */
  async suggestTableForGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const { weddingId, guestId } = req.params;
      const userId                 = req.user!.userId;

      const planType = await getActivePlan(userId, weddingId);
      const result   = await aiService.suggestTableForGuest(userId, weddingId, planType, guestId);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/ai/:weddingId/usage
   */
  async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const { weddingId } = req.params;
      const userId        = req.user!.userId;

      const planType = await getActivePlan(userId, weddingId);
      const usage    = await aiService.getFullUsage(userId, weddingId, planType);

      res.json({ success: true, data: { usage, plan: planType } });
    } catch (err) {
      next(err);
    }
  }
}

export default new AiController();