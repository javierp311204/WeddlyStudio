import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: {
    status: 429,
    error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    error: 'Demasiadas solicitudes de recuperación. Inténtalo de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: {
    status: 429,
    error: 'Demasiadas peticiones al webhook.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    status: 429,
    error: 'Demasiadas peticiones. Inténtalo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});