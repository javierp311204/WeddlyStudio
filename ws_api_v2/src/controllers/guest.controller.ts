import { Request, Response, NextFunction } from 'express';
import guestService from '../services/guest.service';

export class GuestController {
  /**
   * GET /api/weddings/:weddingId/guests
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.getAll(
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
   * GET /api/guests/:guestId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.getById(req.params.guestId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/weddings/:weddingId/guests
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.create(
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
   * POST /api/weddings/:weddingId/guests/:guestId/companions
   */
  async createCompanion(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.createCompanion(
        req.params.weddingId,
        req.params.guestId,
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/guests/:guestId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.update(
        req.params.guestId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/guests/:guestId/rsvp
   */
  async updateRsvp(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.updateRsvp(
        req.params.guestId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/rsvp/:code  (público, sin auth)
   */
  async publicRsvp(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.publicRsvp(req.params.code, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/guests/:guestId
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.remove(req.params.guestId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/weddings/:weddingId/guests/export
   */
  async exportList(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await guestService.exportList(
        req.params.weddingId,
        req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new GuestController();