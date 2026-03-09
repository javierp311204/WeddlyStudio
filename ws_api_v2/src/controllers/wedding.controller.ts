import { Request, Response, NextFunction } from 'express';
import weddingService from '../services/wedding.service';

export class WeddingController {

  /** GET /api/weddings */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.getAll(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /api/weddings/can-create */
  async canCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.canCreate(req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /api/weddings/:id */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.getById(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** POST /api/weddings */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** PATCH /api/weddings/:id */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.update(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** DELETE /api/weddings/:id */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.remove(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** POST /api/weddings/:id/members */
  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.addMember(req.params.id, req.user!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** DELETE /api/weddings/:id/members/:userId */
  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await weddingService.removeMember(
        req.params.id,
        req.user!.userId,
        req.params.userId,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export default new WeddingController();