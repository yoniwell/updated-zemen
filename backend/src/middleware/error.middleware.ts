import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/AppError';
import { logger } from '../common/utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn({ message: err.message, statusCode: err.statusCode, details: err.details }, 'Operational Error');
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details,
      }
    });
    return;
  }

  // Unhandled error
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled Exception');
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    success: false,
    error: {
      message: isProduction ? 'Internal Server Error' : err.message,
    }
  });
};
