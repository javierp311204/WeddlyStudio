import { Request, Response, NextFunction } from 'express';
import taskService from '../services/task.service';

export class TaskController {
  /**
   * POST /api/weddings/:weddingId/tasks/initialize
   */
  async initialize(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taskService.initialize(
        req.params.weddingId,
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/weddings/:weddingId/tasks
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taskService.getAll(
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
   * POST /api/weddings/:weddingId/tasks
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taskService.create(
        req.params.weddingId,
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/tasks/:taskId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taskService.update(
        req.params.taskId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/tasks/:taskId/status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taskService.updateStatus(
        req.params.taskId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/tasks/:taskId
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await taskService.remove(req.params.taskId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new TaskController();