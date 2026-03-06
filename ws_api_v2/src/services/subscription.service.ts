import Stripe from 'stripe';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────

export const subscriptionService = {

  /**
   * Suscripción activa del usuario.
   * Incluye el plan con sus límites y features.
   */
  async getCurrent(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status:  { in: ['active', 'trialing', 'past_due'] },
      },
      orderBy: { created_at: 'desc' },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      // Devolvemos info del plan free para que el frontend siempre tenga datos
      const freePlan = await prisma.plan.findFirst({
        where: { name: { contains: 'free', mode: 'insensitive' } },
      });
      return { subscription: null, plan: freePlan, is_free: true };
    }

    return { subscription, plan: subscription.plan, is_free: false };
  },

  /**
   * Cancela la suscripción activa del usuario.
   * Por defecto cancela al final del período (cancel_at_period_end).
   * Con cancel_immediately=true cancela de inmediato en Stripe.
   */
  async cancel(userId: string, cancelImmediately = false) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status:  { in: ['active', 'trialing'] },
      },
    });

    if (!subscription) {
      throw new AppError('No tienes una suscripción activa para cancelar', 404);
    }

    // Cancelar en Stripe si existe el ID
    if (subscription.stripe_subscription_id) {
      if (cancelImmediately) {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } else {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      }
    }

    // TODO: PayPal — cancelar suscripción vía API de PayPal si tiene paypal_subscription_id

    const updatedStatus = cancelImmediately ? 'cancelled' : subscription.status;

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data:  {
        status:               updatedStatus,
        cancel_at_period_end: !cancelImmediately,
      },
      include: { plan: true },
    });

    return updated;
  },

  // ─── Helpers internos usados desde webhooks ──────────────

  /**
   * Activa o actualiza una suscripción tras pago exitoso de Stripe.
   */
  async activateFromStripe(data: {
    stripeSubscriptionId: string;
    userId:               string;
    planId:               string;
    periodStart:          Date;
    periodEnd:            Date;
  }) {
    // Upsert: si ya existe la actualiza, si no la crea
    const existing = await prisma.subscription.findFirst({
      where: { stripe_subscription_id: data.stripeSubscriptionId },
    });

    if (existing) {
      return prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status:                'active',
          current_period_start:  data.periodStart,
          current_period_end:    data.periodEnd,
          cancel_at_period_end:  false,
        },
      });
    }

    return prisma.subscription.create({
      data: {
        user_id:                data.userId,
        plan_id:                data.planId,
        stripe_subscription_id: data.stripeSubscriptionId,
        status:                 'active',
        current_period_start:   data.periodStart,
        current_period_end:     data.periodEnd,
      },
    });
  },

  /**
   * Activa suscripción desde PayPal (one_time o subscription).
   */
  async activateFromPaypal(data: {
    paypalSubscriptionId: string;
    userId:               string;
    planId:               string;
    periodEnd?:           Date;
  }) {
    const existing = await prisma.subscription.findFirst({
      where: { paypal_subscription_id: data.paypalSubscriptionId },
    });

    if (existing) {
      return prisma.subscription.update({
        where: { id: existing.id },
        data:  {
          status:               'active',
          current_period_end:   data.periodEnd,
          cancel_at_period_end: false,
        },
      });
    }

    return prisma.subscription.create({
      data: {
        user_id:               data.userId,
        plan_id:               data.planId,
        paypal_subscription_id: data.paypalSubscriptionId,
        status:                'active',
        current_period_start:  new Date(),
        current_period_end:    data.periodEnd,
      },
    });
  },

  /**
   * Marca la suscripción como cancelada (webhook stripe o paypal).
   */
  async markCancelled(stripeSubscriptionId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { stripe_subscription_id: stripeSubscriptionId },
    });
    if (!sub) return null;

    return prisma.subscription.update({
      where: { id: sub.id },
      data:  { status: 'cancelled' },
    });
  },

  /**
   * Marca la suscripción como past_due (pago fallido).
   */
  async markPastDue(stripeSubscriptionId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { stripe_subscription_id: stripeSubscriptionId },
    });
    if (!sub) return null;

    return prisma.subscription.update({
      where: { id: sub.id },
      data:  { status: 'past_due' },
    });
  },

  /**
   * Actualiza el plan de la boda según el plan del usuario.
   * Se llama tras activar un pago one_time o subscription.
   */
  async upgradePlan(userId: string, planType: 'free' | 'one_time' | 'subscription', weddingId?: string) {
    if (!weddingId) return;

    // Verificar que la boda pertenece al usuario
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, created_by: userId, deleted_at: null },
    });
    if (!wedding) return;

    await prisma.wedding.update({
      where: { id: weddingId },
      data:  { plan_type: planType },
    });
  },
};