import { Router } from 'express';
import authController from '../controllers/auth.controller';
import tfaController  from '../controllers/tfa.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate }     from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../schemas/auth.schema';
import {
  tfaVerifySetupSchema,
  tfaLoginSchema,
  tfaDisableSchema,
  tfaResetRequestSchema,
  tfaResetConfirmSchema,
} from '../schemas/tfa.schema';

const router = Router();

// ─── Públicas ─────────────────────────────────────────────────────────────
router.post('/register',             validate(registerSchema),       authController.register);
router.post('/login',                validate(loginSchema),          authController.login);
router.post('/refresh',              validate(refreshTokenSchema),   authController.refresh);
router.get ('/verify-email/:token',                                  authController.verifyEmail);
router.post('/resend-verification',                                  authController.resendVerification);

// ─── 2FA públicas (usan temp_token, no sesión completa) ───────────────────
router.post('/2fa/verify',           validate(tfaLoginSchema),         tfaController.verifyLogin);
router.post('/2fa/reset/request',    validate(tfaResetRequestSchema),  tfaController.resetRequest);
router.post('/2fa/reset/confirm',    validate(tfaResetConfirmSchema),  tfaController.resetConfirm);

// ─── Protegidas ───────────────────────────────────────────────────────────
router.get   ('/me',              authenticate,                                                authController.me);
router.patch ('/me',              authenticate, validate(updateProfileSchema),                 authController.updateProfile);
router.patch ('/change-password', authenticate, validate(changePasswordSchema),               authController.changePassword);

// ─── 2FA protegidas ───────────────────────────────────────────────────────
router.get   ('/2fa/status',       authenticate,                              tfaController.getStatus);
router.post  ('/2fa/setup',        authenticate,                              tfaController.setup);
router.post  ('/2fa/setup/verify', authenticate, validate(tfaVerifySetupSchema), tfaController.confirmSetup);
router.delete('/2fa',              authenticate, validate(tfaDisableSchema),     tfaController.disable);

export default router;