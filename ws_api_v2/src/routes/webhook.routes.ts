import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { paymentService } from '../services/payment.service';
import { subscriptionService } from '../services/subscription.service';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

// ─────────────────────────────────────────────────────────────
// STRIPE WEBHOOK
// ─────────────────────────────────────────────────────────────
// IMPORTANTE: esta ruta necesita raw body.
// En app.ts debe registrarse ANTES de express.json():
//
//   app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
//   app.use('/api/webhooks', webhookRoutes);
//
// ─────────────────────────────────────────────────────────────

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,                             // raw Buffer gracias a express.raw()
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error('[Stripe Webhook] Firma inválida:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`[Stripe Webhook] Evento recibido: ${event.type}`);

  try {
    switch (event.type) {

      // ── Pago único completado ─────────────────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;

        const payment = await paymentService.markCompleted({
          stripePaymentId: pi.id,
          invoicePdfUrl:   undefined,    // no disponible en payment_intent, llega en invoice
          metadataJson:    pi.metadata as object,
        });

        if (payment) {
          // Actualizar plan de la boda si viene en metadata
          const { user_id, plan_name, wedding_id } = pi.metadata ?? {};
          if (user_id && plan_name?.toLowerCase().includes('one')) {
            await subscriptionService.upgradePlan(user_id, 'one_time', wedding_id);
          }
        }
        break;
      }

      // ── Pago único fallido ────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await paymentService.markFailed({
          stripePaymentId: pi.id,
          metadataJson:    { failure_message: pi.last_payment_error?.message },
        });
        break;
      }

      // ── Suscripción activada / renovada ───────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;

        const meta     = sub.metadata ?? {};
        const userId   = meta.user_id;
        const planId   = meta.plan_id;
        const weddingId = meta.wedding_id;

        if (!userId || !planId) {
          console.warn('[Stripe Webhook] subscription sin metadata user_id/plan_id', sub.id);
          break;
        }

        // En Stripe v20, current_period_start/end viven en sub.items.data[0]
        const item = sub.items?.data?.[0];
        const periodStart = item?.current_period_start
          ? new Date(item.current_period_start * 1000)
          : new Date();
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await subscriptionService.activateFromStripe({
          stripeSubscriptionId: sub.id,
          userId,
          planId,
          periodStart,
          periodEnd,
        });

        // Actualizar plan de la boda
        if (weddingId) {
          await subscriptionService.upgradePlan(userId, 'subscription', weddingId);
        }
        break;
      }

      // ── Suscripción cancelada ─────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await subscriptionService.markCancelled(sub.id);

        // Revocar plan — volver a free
        const userId    = sub.metadata?.user_id;
        const weddingId = sub.metadata?.wedding_id;
        if (userId && weddingId) {
          await subscriptionService.upgradePlan(userId, 'free', weddingId);
        }
        break;
      }

      // ── Pago de suscripción fallido ───────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // En Stripe v20, subscription_id vive en invoice.parent.subscription_details.subscription
        const subId = (invoice as any).subscription
          ?? (invoice as any).parent?.subscription_details?.subscription;
        if (subId) {
          await subscriptionService.markPastDue(subId as string);
        }
        break;
      }

      // ── Factura pagada (suscripción) ──────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // En Stripe v20, estos campos se acceden via casting a any por cambios de API
        const paymentIntentId = (invoice as any).payment_intent;
        const invoicePdf      = (invoice as any).invoice_pdf;
        const subscriptionId  = (invoice as any).subscription
          ?? (invoice as any).parent?.subscription_details?.subscription;

        if (paymentIntentId) {
          await paymentService.markCompleted({
            stripePaymentId: paymentIntentId as string,
            invoicePdfUrl:   invoicePdf ?? undefined,
            metadataJson:    {
              invoice_id:     invoice.id,
              subscription_id: subscriptionId,
            },
          });
        }
        break;
      }

      // ── Reembolso ─────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await paymentService.markRefunded(
            charge.payment_intent as string,
            { charge_id: charge.id },
          );
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });

  } catch (err: any) {
    console.error('[Stripe Webhook] Error procesando evento:', err.message);
    // Devolver 200 de todas formas para que Stripe no reintente indefinidamente
    // si el error es de lógica de negocio (no de infraestructura)
    res.json({ received: true, warning: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PAYPAL WEBHOOK
// ─────────────────────────────────────────────────────────────
// PayPal no requiere raw body, pero se registra aquí con express.json()
// La verificación de firma se hace con los headers de PayPal.
// ─────────────────────────────────────────────────────────────

router.post('/paypal', async (req: Request, res: Response) => {
  const eventType: string = req.body?.event_type ?? '';

  console.log(`[PayPal Webhook] Evento recibido: ${eventType}`);

  // TODO: verificar firma de PayPal con PAYPAL-TRANSMISSION-ID, PAYPAL-CERT-URL, etc.
  // Por ahora se procesa sin verificación (NO apto para producción sin esto)
  // Documentación: https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/

  try {
    switch (eventType) {

      // ── Orden capturada (pago único) ──────────────────────
      case 'CHECKOUT.ORDER.APPROVED':
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const resource = req.body.resource ?? {};

        // El custom_id tiene el formato "userId|planId|weddingId" (ver checkout.service.ts)
        const customId: string = resource.custom_id
          ?? resource.purchase_units?.[0]?.custom_id
          ?? '';

        const [userId, planId, weddingId] = customId.split('|');
        const orderId: string = resource.supplementary_data?.related_ids?.order_id
          ?? resource.id
          ?? '';

        if (orderId) {
          await paymentService.markCompleted({
            paypalPaymentId: orderId,
            metadataJson:    req.body.resource as object,
          });
        }

        if (userId && planId) {
          await subscriptionService.upgradePlan(userId, 'one_time', weddingId || undefined);
        }
        break;
      }

      // ── Pago fallido ──────────────────────────────────────
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REVERSED': {
        const resource = req.body.resource ?? {};
        const orderId: string = resource.supplementary_data?.related_ids?.order_id ?? resource.id ?? '';

        if (orderId) {
          await paymentService.markFailed({
            paypalPaymentId: orderId,
            metadataJson:    req.body.resource as object,
          });
        }
        break;
      }

      // ── Suscripción activada ──────────────────────────────
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const resource = req.body.resource ?? {};
        const customId: string = resource.custom_id ?? '';
        const [userId, planId, weddingId] = customId.split('|');

        if (userId && planId) {
          await subscriptionService.activateFromPaypal({
            paypalSubscriptionId: resource.id,
            userId,
            planId,
            periodEnd: resource.billing_info?.next_billing_time
              ? new Date(resource.billing_info.next_billing_time)
              : undefined,
          });

          await subscriptionService.upgradePlan(userId, 'subscription', weddingId || undefined);
        }
        break;
      }

      // ── Suscripción cancelada ─────────────────────────────
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        // TODO: marcar suscripción como cancelada por paypal_subscription_id
        // y revocar plan de la boda
        console.log('[PayPal Webhook] Suscripción cancelada/expirada (TODO implementar)');
        break;
      }

      default:
        console.log(`[PayPal Webhook] Evento no manejado: ${eventType}`);
    }

    res.json({ received: true });

  } catch (err: any) {
    console.error('[PayPal Webhook] Error procesando evento:', err.message);
    res.json({ received: true, warning: err.message });
  }
});

export default router;