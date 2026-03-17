import { Router } from 'express';
import aiController from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const aiRouter = Router();
aiRouter.use(authenticate);

// ── Chat general ──────────────────────────────────────────────────
aiRouter.post('/:weddingId/chat', aiController.chat);

// ── Sugerencias por módulo ────────────────────────────────────────
aiRouter.post('/:weddingId/suggest-tasks',          aiController.suggestTasks);
aiRouter.post('/:weddingId/suggest-seating',        aiController.suggestSeating);
aiRouter.post('/:weddingId/suggest-table/:guestId', aiController.suggestTableForGuest);

// ── Uso del mes actual ────────────────────────────────────────────
aiRouter.get('/:weddingId/usage', aiController.getUsage);

export { aiRouter };