import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { singleAvatar } from '../middleware/upload.middleware';
import userController from '../controllers/user.controller';

const router = Router();
router.use(authenticate);

// POST /api/users/me/avatar — subir/actualizar foto de perfil
router.post('/me/avatar', singleAvatar, userController.uploadAvatar);

// DELETE /api/users/me — eliminar cuenta
router.delete('/me', userController.deleteAccount);

export default router;