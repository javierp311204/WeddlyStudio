import { Request, Response, NextFunction } from 'express';
import * as tfaService from '../services/tfa.service';

const tfaController = {

  // GET /api/auth/2fa/status
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tfaService.getStatus(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  // POST /api/auth/2fa/setup — genera secreto + QR data URL
  async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tfaService.generateSetup(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  // POST /api/auth/2fa/setup/verify — confirma el TOTP y activa 2FA
  async confirmSetup(req: Request, res: Response, next: NextFunction) {
    try {
      await tfaService.confirmSetup(req.user!.userId, req.body.token);
      res.json({ success: true, message: '2FA activado correctamente' });
    } catch (err) { next(err); }
  },

  // DELETE /api/auth/2fa — desactiva 2FA (requiere contraseña)
  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      await tfaService.disable2FA(req.user!.userId, req.body.password);
      res.json({ success: true, message: '2FA desactivado correctamente' });
    } catch (err) { next(err); }
  },

  // POST /api/auth/2fa/verify — verifica TOTP en el flujo de login
  async verifyLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { temp_token, token } = req.body;
      const tokens = await tfaService.verifyLogin(temp_token, token);
      res.json({ success: true, data: tokens });
    } catch (err) { next(err); }
  },

  // POST /api/auth/2fa/reset/request — solicita reset por email
  async resetRequest(req: Request, res: Response, next: NextFunction) {
    try {
      await tfaService.requestReset(req.body.email);
      // Siempre 200 para no filtrar info
      res.json({ success: true, message: 'Si el email existe recibirás instrucciones.' });
    } catch (err) { next(err); }
  },

  // POST /api/auth/2fa/reset/confirm — confirma reset con token del email
  async resetConfirm(req: Request, res: Response, next: NextFunction) {
    try {
      await tfaService.confirmReset(req.body.reset_token);
      res.json({ success: true, message: '2FA desactivado. Ya puedes iniciar sesión normalmente.' });
    } catch (err) { next(err); }
  },
};

export default tfaController;