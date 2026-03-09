import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body:   req.body,
      query:  req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: result.error.issues.map((issue) => ({
          field:   issue.path.slice(1).join('.'),
          message: issue.message,
        })),
      });
    }

    const data = result.data as Record<string, any>;

    if (data['body'])   req.body   = data['body'];
    if (data['query'])  req.query  = data['query'];
    if (data['params']) req.params = data['params'];

    next();
  };
};