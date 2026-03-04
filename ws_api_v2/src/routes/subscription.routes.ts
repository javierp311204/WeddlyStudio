import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { subscriptionController } from '../controllers/subscription.controller';
import { cancelSubscriptionSchema } from '../schemas/payment.schema';

const router = Router();

// GET    /api/subscriptions/current         → suscripción activa + plan
// DELETE /api/subscriptions/current/cancel  → cancelar suscripción

router.get(
  '/current',
  authenticate,
  subscriptionController.getCurrent,
);

router.delete(
  '/current/cancel',
  authenticate,
  validate(cancelSubscriptionSchema),
  subscriptionController.cancel,
);

export default router;