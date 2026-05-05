import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'strict' as const,
  path: '/',
};

const ACCESS_TOKEN_TTL  = 15 * 60 * 1000;          
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;  

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token',  accessToken,  { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_TTL });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_TTL });
}

export class AuthController {

  async socialLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { provider } = req.params;
      const result = await authService.getSocialUrl(provider as any);

      if (result && result.url) {
        return res.redirect(result.url); 
      }
      
      throw new Error('No se pudo generar la URL de redirección');
    } catch (err) {
      next(err);
    }
  }

  async socialCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query.code as string;
      
      if (!code) {
        return res.redirect(`${process.env.CORS_ORIGIN}/login?error=no_code`);
      }

      const result = await authService.exchangeCodeForSession(code);

      // Inyectar tokens en cookies httpOnly
      setTokenCookies(res, result.access_token, result.refresh_token);

      // Redirigir al usuario al frontend (Dashboard)
      res.redirect(`${process.env.CORS_ORIGIN}/dashboard`);
    } catch (err) {
      console.error('[SocialAuth Error]:', err);
      res.redirect(`${process.env.CORS_ORIGIN}/login?error=social_auth_failed`);
    }
  }

  async socialToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { access_token } = req.body;
      if (!access_token) {
        return res.status(400).json({ success: false, message: 'Token requerido' });
      }

      const result = await authService.loginWithSupabaseToken(access_token);

      setTokenCookies(res, result.access_token, result.refresh_token);

      res.json({
        success: true,
        data: {
          user: result.user,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);

      setTokenCookies(res, result.access_token, result.refresh_token);

      res.status(201).json({
        success: true,
        data: {
          user:    result.user,
          message: result.message,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);

      // Si requiere 2FA, no hay tokens todavía
      if (result.requires_2fa) {
        return res.json({ success: true, data: result });
      }

      // ✅ Tokens en cookies
      setTokenCookies(res, result.access_token, result.refresh_token);

      res.json({
        success: true,
        data: {
          requires_2fa: false,
          user:         result.user,
          ...(result.warning && { warning: result.warning }),
          
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token no encontrado' });
      }

      const result = await authService.refreshToken(refreshToken);

      setTokenCookies(res, result.access_token, result.refresh_token);

      res.json({ success: true, data: { message: 'Token renovado correctamente' } });
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.verifyEmail(req.params.token);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resendVerification(req.body.email);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.userId);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.updateProfile(req.user!.userId, req.body);
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.changePassword(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, new_password } = req.body;
      const result = await authService.resetPassword(token, new_password);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export default new AuthController();