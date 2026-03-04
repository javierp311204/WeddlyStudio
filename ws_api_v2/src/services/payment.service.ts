import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface ListPaymentsOptions {
  userId:  string;
  page:    number;
  limit:   number;
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
}

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────

export const paymentService = {

  /**
   * Historial de pagos del usuario autenticado.
   * Paginado, con filtro opcional por status.
   */
  async listByUser({ userId, page, limit, status }: ListPaymentsOptions) {
    const skip = (page - 1) * limit;

    const where = {
      user_id: userId,
      ...(status ? { status } : {}),
    };

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id:               true,
          amount:           true,
          currency:         true,
          status:           true,
          description:      true,
          invoice_pdf_url:  true,
          stripe_payment_id: true,
          paypal_payment_id: true,
          created_at:       true,
          updated_at:       true,
          wedding: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next:    page * limit < total,
        has_prev:    page > 1,
      },
    };
  },

  /**
   * Detalle de un pago — solo el dueño o admin pueden verlo.
   */
  async getById(paymentId: string, userId: string, globalRole: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        wedding: { select: { id: true, name: true } },
      },
    });

    if (!payment) throw new AppError('Pago no encontrado', 404);

    const isOwner = payment.user_id === userId;
    const isAdmin = ['admin', 'superadmin'].includes(globalRole);

    if (!isOwner && !isAdmin) {
      throw new AppError('No tienes permiso para ver este pago', 403);
    }

    return payment;
  },

  // ─── Helpers internos usados desde webhooks ──────────────

  /**
   * Crea un registro de pago con estado inicial `pending`.
   * Llamado al iniciar el checkout.
   */
  async createPending(data: {
    userId:          string;
    weddingId?:      string;
    amount:          number;
    currency:        string;
    description?:    string;
    stripePaymentId?: string;
    paypalPaymentId?: string;
    metadataJson?:   object;
  }) {
    return prisma.payment.create({
      data: {
        user_id:           data.userId,
        wedding_id:        data.weddingId,
        amount:            data.amount,
        currency:          data.currency,
        status:            'pending',
        description:       data.description,
        stripe_payment_id: data.stripePaymentId,
        paypal_payment_id: data.paypalPaymentId,
        metadata_json:     data.metadataJson as any,
      },
    });
  },

  /**
   * Marca un pago como completado y actualiza el plan de la boda.
   */
  async markCompleted(data: {
    stripePaymentId?: string;
    paypalPaymentId?: string;
    invoicePdfUrl?:   string;
    metadataJson?:    object;
  }) {
    const where = data.stripePaymentId
      ? { stripe_payment_id: data.stripePaymentId }
      : { paypal_payment_id: data.paypalPaymentId };

    const payment = await prisma.payment.findFirst({ where });
    if (!payment) throw new AppError('Pago no encontrado para marcar como completado', 404);

    return prisma.payment.update({
      where: { id: payment.id },
      data:  {
        status:           'completed',
        invoice_pdf_url:  data.invoicePdfUrl,
        metadata_json:    data.metadataJson as any,
      },
    });
  },

  /**
   * Marca un pago como fallido.
   */
  async markFailed(data: {
    stripePaymentId?: string;
    paypalPaymentId?: string;
    metadataJson?:    object;
  }) {
    const where = data.stripePaymentId
      ? { stripe_payment_id: data.stripePaymentId }
      : { paypal_payment_id: data.paypalPaymentId };

    const payment = await prisma.payment.findFirst({ where });
    if (!payment) return null; // puede llegar antes que el registro exista

    return prisma.payment.update({
      where: { id: payment.id },
      data:  {
        status:        'failed',
        metadata_json: data.metadataJson as any,
      },
    });
  },

  /**
   * Marca un pago como reembolsado.
   */
  async markRefunded(stripePaymentId: string, metadataJson?: object) {
    const payment = await prisma.payment.findFirst({
      where: { stripe_payment_id: stripePaymentId },
    });
    if (!payment) throw new AppError('Pago no encontrado para reembolso', 404);

    return prisma.payment.update({
      where: { id: payment.id },
      data:  {
        status:        'refunded',
        metadata_json: metadataJson as any,
      },
    });
  },
};