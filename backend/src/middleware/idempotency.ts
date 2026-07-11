import { NextFunction, Request, Response } from 'express';
import { createHash } from 'crypto';
import { AuthRequest } from './auth';

type CachedResponse = {
  key: string;
  fingerprint: string;
  statusCode: number;
  body: unknown;
  createdAt: number;
};

const STORE_TTL_MS = 24 * 60 * 60 * 1000;
const store = new Map<string, CachedResponse>();

const cleanupExpiredEntries = (now: number): void => {
  for (const [key, entry] of store.entries()) {
    if (now - entry.createdAt > STORE_TTL_MS) {
      store.delete(key);
    }
  }
};

const buildFingerprint = (req: AuthRequest): string => {
  const bodyString = typeof req.body === 'undefined' ? '' : JSON.stringify(req.body);
  const raw = [req.method, req.path, req.user?.id || 'anonymous', bodyString].join('|');
  return createHash('sha256').update(raw).digest('hex');
};

const getIdempotencyKey = (req: Request): string | null => {
  const value = req.header('Idempotency-Key');
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const idempotency = () => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const key = getIdempotencyKey(req);
    if (!key) {
      next();
      return;
    }

    const now = Date.now();
    cleanupExpiredEntries(now);

    const fingerprint = buildFingerprint(req);
    const existing = store.get(key);

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        res.status(409).json({
          error: 'Idempotency key is already used for a different request payload',
        });
        return;
      }

      res.status(existing.statusCode).json(existing.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      store.set(key, {
        key,
        fingerprint,
        statusCode: res.statusCode,
        body,
        createdAt: now,
      });
      return originalJson(body);
    }) as Response['json'];

    next();
  };
};
