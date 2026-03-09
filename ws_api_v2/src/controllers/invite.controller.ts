import { Request, Response, NextFunction } from 'express';
import inviteService from '../services/invite.service';

export class InviteController {

  /** POST /api/weddings/:id/invites */
  async sendInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.sendInvite(
        req.params.id, req.user!.userId, req.body,
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /api/weddings/:id/invites */
  async getInvites(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.getInvites(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** DELETE /api/weddings/:id/invites/:inviteId */
  async revokeInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.revokeInvite(
        req.params.id, req.user!.userId, req.params.inviteId,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** DELETE /api/weddings/:id/members/:memberId */
  async revokeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.revokeMember(
        req.params.id, req.user!.userId, req.params.memberId,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /api/invites/preview/:token — público */
  async previewInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.previewInvite(req.params.token);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** POST /api/invites/accept/:token — requiere auth */
  async acceptInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.acceptInvite(
        req.params.token, req.user!.userId,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export default new InviteController();