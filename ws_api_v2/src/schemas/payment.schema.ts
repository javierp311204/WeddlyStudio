import { z } from 'zod';

// ─── Payments ───────────────────────────────────────────────
export const listPaymentsSchema = z.object({
  query: z.object({
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(100).default(20),
    status:   z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  }),
});

// ─── Subscriptions ──────────────────────────────────────────
export const cancelSubscriptionSchema = z.object({
  body: z.object({
    cancel_immediately: z.boolean().default(false),
  }),
});

// ─── Stripe Checkout ────────────────────────────────────────
export const createStripeCheckoutSchema = z.object({
  body: z.object({
    plan_id:    z.string().uuid('plan_id inválido'),
    wedding_id: z.string().uuid('wedding_id inválido').optional(),
    interval:   z.enum(['month', 'year']).default('month'),
  }),
});

// ─── PayPal Order ───────────────────────────────────────────
export const createPaypalOrderSchema = z.object({
  body: z.object({
    plan_id:    z.string().uuid('plan_id inválido'),
    wedding_id: z.string().uuid('wedding_id inválido').optional(),
  }),
});

export const capturePaypalOrderSchema = z.object({
  params: z.object({
    orderId: z.string().min(1),
  }),
});