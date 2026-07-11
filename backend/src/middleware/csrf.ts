import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { buildAuthCookieOptions } from '../utils/auth-cookies';

const CSRF_COOKIE_NAME = 'zemen_csrf_token';
const SESSION_COOKIE_NAME = 'zemen_admin_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const index = entry.indexOf('=');
      if (index <= 0) {
        return acc;
      }
      const key = entry.slice(0, index);
      const value = entry.slice(index + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

const isSafeMethod = (method: string): boolean => ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

const issueCsrfToken = () => crypto.randomBytes(24).toString('hex');

export const ensureCsrfCookie = (req: Request, res: Response, next: NextFunction): void => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[CSRF_COOKIE_NAME]) {
    next();
    return;
  }

  res.cookie(CSRF_COOKIE_NAME, issueCsrfToken(), {
    ...buildAuthCookieOptions({ httpOnly: false }),
  });
  next();
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (isSafeMethod(req.method)) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const hasSessionCookie = Boolean(cookies[SESSION_COOKIE_NAME]);

  // Enforce CSRF validation only for cookie-backed admin sessions.
  if (!hasSessionCookie) {
    next();
    return;
  }

  const csrfCookie = cookies[CSRF_COOKIE_NAME];
  const csrfHeader = req.header(CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
};
