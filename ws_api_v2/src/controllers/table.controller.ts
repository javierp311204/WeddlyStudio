import { Request, Response, NextFunction } from 'express';
import tableService from '../services/table.service';

export class TableController {
  /**
   * GET /api/weddings/:weddingId/tables
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.getAll(
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
   * GET /api/tables/:tableId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.getById(req.params.tableId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/weddings/:weddingId/tables
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.create(
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
   * PATCH /api/tables/:tableId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.update(
        req.params.tableId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/tables/:tableId/position
   */
  async updatePosition(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.updatePosition(
        req.params.tableId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/tables/:tableId/assign
   */
  async assignGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.assignGuest(
        req.params.tableId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/tables/:tableId/unassign/:guestId
   */
  async unassignGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.unassignGuest(
        req.params.tableId,
        req.params.guestId,
        req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/tables/:tableId
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tableService.remove(req.params.tableId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new TableController();