import { Request, Response, NextFunction } from 'express';
import inviteService from '../services/invite.service';
import prisma from '../config/db';

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

  /** POST /api/invites/decline/:token — requiere auth */
  async declineInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { email: true },
      });
      const data = await inviteService.declineInvite(req.params.token, user!.email);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /api/weddings/:id/members */
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.getMembers(req.params.id, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // PATCH /api/weddings/:id/members/:memberId/role
  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inviteService.updateMemberRole(
        req.params.id,
        req.user!.userId,
        req.params.memberId,
        req.body.role,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export default new InviteController();