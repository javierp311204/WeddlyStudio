import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../schemas/auth.schema';

const router = Router();

// Rutas públicas
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.get('/verify-email/:token',                                    authController.verifyEmail);
router.post('/resend-verification',                                   authController.resendVerification);

// Rutas protegidas
router.get('/me', authenticate, authController.me);
router.patch('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
