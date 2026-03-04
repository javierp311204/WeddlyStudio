import Stripe from 'stripe';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { paymentService } from './payment.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

const PAYPAL_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// ─────────────────────────────────────────────────────────────
// HELPERS PAYPAL
// ─────────────────────────────────────────────────────────────

async function getPaypalAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new AppError('Error al obtener token de PayPal', 502);

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─────────────────────────────────────────────────────────────
// CHECKOUT SERVICE
// ─────────────────────────────────────────────────────────────

export const checkoutService = {

  // ─── STRIPE ─────────────────────────────────────────────

  /**
   * Crea una Stripe Checkout Session.
   * - Suscripción recurrente (plan subscription) → mode: 'subscription'
   * - Pago único (plan one_time)                 → mode: 'payment'
   */
  async createStripeSession(data: {
    userId:     string;
    planId:     string;
    weddingId?: string;
    interval:   'month' | 'year';
  }) {
    const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan || !plan.is_active) throw new AppError('Plan no válido', 404);

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, first_name: true, last_name: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const isSubscription = plan.name.toLowerCase().includes('subscription');
    const successUrl = `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${process.env.FRONTEND_URL}/payment/cancel`;

    const metadata: Record<string, string> = {
      user_id:  data.userId,
      plan_id:  data.planId,
      plan_name: plan.name,
    };
    if (data.weddingId) metadata.wedding_id = data.weddingId;

    // Precio unitario en céntimos
    const unitAmount = Math.round(Number(plan.price) * 100);

    let session: Stripe.Checkout.Session;

    if (isSubscription) {
      // Modo suscripción recurrente
      const stripePrice = await stripe.prices.create({
        unit_amount: unitAmount,
        currency:    plan.currency.toLowerCase(),
        recurring:   { interval: data.interval },
        product_data: { name: plan.name },
        metadata,
      });

      session = await stripe.checkout.sessions.create({
        mode:               'subscription',
        payment_method_types: ['card'],
        customer_email:     user.email,
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        subscription_data:  { metadata },
        success_url:        successUrl,
        cancel_url:         cancelUrl,
        metadata,
      });
    } else {
      // Modo pago único (one_time)
      session = await stripe.checkout.sessions.create({
        mode:               'payment',
        payment_method_types: ['card'],
        customer_email:     user.email,
        line_items: [{
          quantity:    1,
          price_data:  {
            currency:     plan.currency.toLowerCase(),
            unit_amount:  unitAmount,
            product_data: { name: plan.name },
          },
        }],
        payment_intent_data: { metadata },
        success_url:         successUrl,
        cancel_url:          cancelUrl,
        metadata,
      });

      // Registrar pago pendiente en BD
      await paymentService.createPending({
        userId:          data.userId,
        weddingId:       data.weddingId,
        amount:          Number(plan.price),
        currency:        plan.currency,
        description:     `Plan ${plan.name}`,
        stripePaymentId: session.payment_intent as string,
        metadataJson:    { session_id: session.id },
      });
    }

    return { url: session.url, session_id: session.id };
  },

  // ─── PAYPAL ─────────────────────────────────────────────

  /**
   * Crea una PayPal Order para pago único.
   */
  async createPaypalOrder(data: {
    userId:     string;
    planId:     string;
    weddingId?: string;
  }) {
    const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan || !plan.is_active) throw new AppError('Plan no válido', 404);

    const accessToken = await getPaypalAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: plan.currency,
          value:         Number(plan.price).toFixed(2),
        },
        description: `Weddly — Plan ${plan.name}`,
        custom_id:   `${data.userId}|${data.planId}|${data.weddingId ?? ''}`,
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/payment/paypal/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        brand_name: 'Weddly Studio',
        user_action: 'PAY_NOW',
      },
    };

    const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method:  'POST',
      headers: {
        Authorization:   `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
        'PayPal-Request-Id': `weddly-${data.userId}-${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new AppError(`Error al crear orden PayPal: ${JSON.stringify(err)}`, 502);
    }

    const order = await res.json() as { id: string; links: Array<{ href: string; rel: string }> };

    // Registrar pago pendiente en BD
    await paymentService.createPending({
      userId:          data.userId,
      weddingId:       data.weddingId,
      amount:          Number(plan.price),
      currency:        plan.currency,
      description:     `Plan ${plan.name}`,
      paypalPaymentId: order.id,
      metadataJson:    { paypal_order_id: order.id },
    });

    const approvalLink = order.links.find(l => l.rel === 'approve');
    return { order_id: order.id, approval_url: approvalLink?.href };
  },

  /**
   * Captura una PayPal Order tras aprobación del usuario.
   */
  async capturePaypalOrder(orderId: string) {
    const accessToken = await getPaypalAccessToken();

    const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new AppError(`Error al capturar orden PayPal: ${JSON.stringify(err)}`, 502);
    }

    const capture = await res.json() as {
      id: string;
      status: string;
      purchase_units: Array<{ payments: { captures: Array<{ id: string; status: string }> } }>;
      purchase_units_custom_id?: string;
    };

    const captureStatus = capture.purchase_units?.[0]?.payments?.captures?.[0]?.status;

    if (captureStatus !== 'COMPLETED') {
      throw new AppError(`Captura de PayPal con estado inesperado: ${captureStatus}`, 402);
    }

    // Marcar pago como completado en BD
    await paymentService.markCompleted({
      paypalPaymentId: orderId,
      metadataJson:    capture as unknown as object,
    });

    return { order_id: orderId, status: captureStatus };
  },
};