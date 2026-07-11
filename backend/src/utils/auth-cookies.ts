import { CookieOptions } from 'express';

const normalizeSameSite = (value: string | undefined): CookieOptions['sameSite'] => {
  const raw = (value || '').toLowerCase();
  if (raw === 'strict' || raw === 'none' || raw === 'lax') {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
};

export const getSecureCookieSettings = (): { sameSite: CookieOptions['sameSite']; secure: boolean } => {
  const sameSite = normalizeSameSite(process.env.COOKIE_SAME_SITE);
  const secureByEnv = process.env.NODE_ENV === 'production';
  const secure = secureByEnv || sameSite === 'none';

  return { sameSite, secure };
};

export const buildAuthCookieOptions = (input: {
  httpOnly: boolean;
  maxAge?: number;
}): CookieOptions => {
  const { sameSite, secure } = getSecureCookieSettings();
  const cookieDomain = (process.env.COOKIE_DOMAIN || '').trim();
  return {
    httpOnly: input.httpOnly,
    sameSite,
    secure,
    maxAge: input.maxAge,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
};
