import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { checkoutService } from '../services/checkout.service';

export const paymentController = {

  /**
   * GET /api/payments
   * Historial de pagos del usuario autenticado.
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status } = req.query as any;

      const result = await paymentService.listByUser({
        userId: req.user!.userId,
        page:   Number(page)  || 1,
        limit:  Number(limit) || 20,
        status,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/payments/:paymentId
   * Detalle de un pago.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.getById(
        req.params.paymentId,
        req.user!.userId,
        req.user!.globalRole,
      );
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  },

  // ─── Stripe Checkout ──────────────────────────────────────

  /**
   * POST /api/payments/checkout/stripe
   * Crea una Stripe Checkout Session y devuelve la URL de pago.
   */
  async createStripeCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const { plan_id, wedding_id, interval } = req.body;

      const session = await checkoutService.createStripeSession({
        userId:     req.user!.userId,
        planId:     plan_id,
        weddingId:  wedding_id,
        interval:   interval ?? 'month',
      });

      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  },

  // ─── PayPal ───────────────────────────────────────────────

  /**
   * POST /api/payments/checkout/paypal
   * Crea una PayPal Order y devuelve la URL de aprobación.
   */
  async createPaypalOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { plan_id, wedding_id } = req.body;

      const order = await checkoutService.createPaypalOrder({
        userId:    req.user!.userId,
        planId:    plan_id,
        weddingId: wedding_id,
      });

      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payments/checkout/paypal/capture/:orderId
   * Captura la orden PayPal tras aprobación del usuario.
   * El frontend llama a este endpoint desde la return_url de PayPal.
   */
  async capturePaypalOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await checkoutService.capturePaypalOrder(req.params.orderId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};