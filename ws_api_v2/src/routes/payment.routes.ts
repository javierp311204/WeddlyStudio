import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { paymentController } from '../controllers/payment.controller';
import {
  listPaymentsSchema,
  createStripeCheckoutSchema,
  createPaypalOrderSchema,
  capturePaypalOrderSchema,
} from '../schemas/payment.schema';

const router = Router();

// ─── Historial ────────────────────────────────────────────────
// GET  /api/payments              → lista paginada del usuario
// GET  /api/payments/:paymentId   → detalle de un pago

router.get(
  '/',
  authenticate,
  validate(listPaymentsSchema),
  paymentController.list,
);

router.get(
  '/:paymentId',
  authenticate,
  paymentController.getOne,
);

// ─── Stripe Checkout ─────────────────────────────────────────
// POST /api/payments/checkout/stripe
// Devuelve { url, session_id } — el frontend redirige a url

router.post(
  '/checkout/stripe',
  authenticate,
  validate(createStripeCheckoutSchema),
  paymentController.createStripeCheckout,
);

// ─── PayPal ───────────────────────────────────────────────────
// POST /api/payments/checkout/paypal
// Devuelve { order_id, approval_url } — el frontend redirige a approval_url

router.post(
  '/checkout/paypal',
  authenticate,
  validate(createPaypalOrderSchema),
  paymentController.createPaypalOrder,
);

// POST /api/payments/checkout/paypal/capture/:orderId
// El frontend llama esto desde la return_url tras aprobación del usuario

router.post(
  '/checkout/paypal/capture/:orderId',
  authenticate,
  validate(capturePaypalOrderSchema),
  paymentController.capturePaypalOrder,
);

export default router;