import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';

export const subscriptionController = {

  /**
   * GET /api/subscriptions/current
   * Devuelve la suscripción activa del usuario + datos del plan.
   * Si no tiene suscripción activa, devuelve el plan free.
   */
  async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionService.getCurrent(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/subscriptions/current/cancel
   * Cancela la suscripción activa.
   * Body: { cancel_immediately?: boolean } — default false (al final del período)
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { cancel_immediately } = req.body;

      const updated = await subscriptionService.cancel(
        req.user!.userId,
        cancel_immediately === true,
      );

      const message = cancel_immediately
        ? 'Suscripción cancelada inmediatamente'
        : 'Suscripción cancelada al final del período actual';

      res.json({ success: true, data: updated, message });
    } catch (err) {
      next(err);
    }
  },
};