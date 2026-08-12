export const AUTH_CONSTANTS = {
  WINDOW_MS: 15 * 60 * 1000,
  EMAIL_RATE_LIMIT_MAX: 12,
  EMAIL_LOCKOUT_THRESHOLD: 5,
  LOCKOUT_MS: 15 * 60 * 1000,
  ACCESS_TOKEN_TTL_MS: 24 * 60 * 60 * 1000,
  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  INVITE_TOKEN_PREFIX: 'invite.token.',
  CSRF_COOKIE_NAME: 'zemen_csrf_token',
  ADMIN_TOKEN_COOKIE: 'zemen_admin_token',
  ADMIN_REFRESH_COOKIE: 'zemen_admin_refresh',
};
