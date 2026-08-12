import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../common/errors/AppError';
import { logger } from '../common/utils/logger';

interface ValidationSchemas {
  body?: ZodSchema<any>;
  params?: ZodSchema<any>;
  query?: ZodSchema<any>;
  headers?: ZodSchema<any>;
}

export const validate = (schemas: ValidationSchemas) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.headers) {
        req.headers = await schemas.headers.parseAsync(req.headers);
      }
      next();
      } catch (error: any) {
        if (error instanceof ZodError || error.issues || error.errors) {
          const rawErrors = error.issues || error.errors || [];
          const errors = rawErrors.map((err: any) => ({
            path: err.path ? err.path.join('.') : 'unknown',
            message: err.message,
          }));
        
        logger.warn({ errors, path: req.path }, 'Validation Error');
        
        next(new AppError('Validation failed', 400, errors));
      } else {
        next(error);
      }
    }
};
