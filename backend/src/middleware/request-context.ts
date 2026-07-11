import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

const parseRequestId = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized.slice(0, 128) : null;
};

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = parseRequestId(req.header('x-request-id')) || randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info('http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      ipAddress: req.ip,
      userId: req.user?.id || null,
    });
  });

  next();
};
