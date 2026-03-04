import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.middleware';
import prisma from './config/db';
import authRoutes from './routes/auth.routes';
import weddingRoutes from './routes/wedding.routes';
import { weddingTaskRouter, taskRouter } from './routes/task.routes';
import { weddingGuestRouter, guestRouter, rsvpRouter } from './routes/guest.routes';
import { weddingTableRouter, tableRouter } from './routes/table.routes';
import { weddingPhotoRouter, photoRouter } from './routes/photo.routes';
import { weddingInvitationRouter, invitationRouter } from './routes/invitation.routes';
import paymentRoutes      from './routes/payment.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes      from './routes/webhook.routes';

const app = express();

// ════════════════════════════════════════════════════════════════
// — RAW BODY para Stripe
// CRÍTICO: debe registrarse ANTES de express.json().
// Si va después, el body ya estará parseado como JSON y la
// verificación de firma de Stripe fallará siempre con 400.
// ════════════════════════════════════════════════════════════════
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
);

// ════════════════════════════════════════════════════════════════
// — Middlewares globales
// ════════════════════════════════════════════════════════════════
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ════════════════════════════════════════════════════════════════
// — Health check
// ════════════════════════════════════════════════════════════════
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ════════════════════════════════════════════════════════════════
// — Rutas API
// ════════════════════════════════════════════════════════════════

// ─── Auth ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Weddings ────────────────────────────────────────────────────
app.use('/api/weddings', weddingRoutes);

// ─── Tasks ───────────────────────────────────────────────────────
app.use('/api/weddings/:weddingId/tasks', weddingTaskRouter);
app.use('/api/tasks',                     taskRouter);

// ─── Guests ──────────────────────────────────────────────────────
app.use('/api/weddings/:weddingId/guests', weddingGuestRouter);
app.use('/api/guests',                     guestRouter);
app.use('/api/rsvp',                       rsvpRouter);          // público, sin auth

// ─── Tables ──────────────────────────────────────────────────────
app.use('/api/weddings/:weddingId/tables', weddingTableRouter);
app.use('/api/tables',                     tableRouter);

// ─── Photos ──────────────────────────────────────────────────────
app.use('/api/weddings/:weddingId/photos', weddingPhotoRouter);
app.use('/api/photos',                     photoRouter);

// ─── Invitations ─────────────────────────────────────────────────
app.use('/api/weddings/:weddingId/invitations', weddingInvitationRouter);
app.use('/api/invitations',                      invitationRouter);

// ─── Payments ────────────────────────────────────────────────────
app.use('/api/payments',      paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks',      webhookRoutes);   // /stripe y /paypal

// ─── Plans — endpoint público inline ─────────────────────────────
// Sin auth. El frontend lo usa para la página de precios.
// No tiene controller propio para no crear un fichero extra.
app.get('/api/plans', async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where:   { is_active: true },
      orderBy: { price: 'asc' },
    });
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════
// — 404 y error handler global (siempre al final)
// ════════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.path} no encontrada`,
  });
});

app.use(errorHandler);

export default app;