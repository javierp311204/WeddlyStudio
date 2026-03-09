import { Router } from 'express';
import weddingController from '../controllers/wedding.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createWeddingSchema,
  updateWeddingSchema,
  weddingIdSchema,
  addWeddingMemberSchema,
} from '../schemas/wedding.schema';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ─── Rutas sin parámetro (DEBEN ir antes de /:id) ────────────────
router.get('/',            weddingController.getAll);
router.post('/', validate(createWeddingSchema), weddingController.create);

// ✅ can-create va ANTES de /:id para que Express no lo trate como un UUID
router.get('/can-create',  weddingController.canCreate);

// ─── CRUD con :id ────────────────────────────────────────────────
router.get('/:id',    validate(weddingIdSchema),    weddingController.getById);
router.patch('/:id',  validate(updateWeddingSchema), weddingController.update);
router.delete('/:id', validate(weddingIdSchema),    weddingController.remove);

// ─── Gestión de miembros ─────────────────────────────────────────
router.post('/:id/members',          validate(addWeddingMemberSchema), weddingController.addMember);
router.delete('/:id/members/:userId', validate(weddingIdSchema),       weddingController.removeMember);

export default router;