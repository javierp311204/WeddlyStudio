import { Request, Response, NextFunction } from 'express';
import invitationService from '../services/invitation.service';

export class InvitationController {
  /**
   * GET /api/weddings/:weddingId/invitations
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.getAll(
        req.params.weddingId,
        req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/invitations/:invitationId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.getById(
        req.params.invitationId,
        req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/weddings/:weddingId/invitations
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.create(
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
   * PATCH /api/invitations/:invitationId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.update(
        req.params.invitationId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/invitations/:invitationId/send
   */
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.send(
        req.params.invitationId,
        req.user!.userId,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/invitations/:invitationId/sends
   */
  async getSends(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.getSends(
        req.params.invitationId,
        req.user!.userId,
        req.query as any,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/invitations/:invitationId/resend/:guestId
   */
  async resend(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.resend(
        req.params.invitationId,
        req.params.guestId,
        req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/invitations/:invitationId
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invitationService.remove(
        req.params.invitationId,
        req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new InvitationController();