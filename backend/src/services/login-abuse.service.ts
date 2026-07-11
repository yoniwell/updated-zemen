import prisma from '../config/database';

const WINDOW_MS = 15 * 60 * 1000;
const EMAIL_RATE_LIMIT_MAX = 12;
const EMAIL_LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export async function evaluateLoginAttempt(email: string, now = Date.now()): Promise<{ allowed: true } | { allowed: false; status: 423 | 429; message: string }> {
  const normalized = normalizeEmail(email);
  const state = await prisma.loginAbuseState.findUnique({ where: { email: normalized } });
  const lockedUntil = state?.lockoutUntil?.getTime();

  if (lockedUntil && lockedUntil > now) {
    const seconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
    return {
      allowed: false,
      status: 423,
      message: `Account temporarily locked. Try again in ${seconds} seconds.`,
    };
  }

  if (lockedUntil && lockedUntil <= now) {
    await prisma.loginAbuseState.update({
      where: { email: normalized },
      data: { lockoutUntil: null },
    });
  }

  let failedAttempts = state?.failedAttempts || 0;
  const windowStartAt = state?.windowStartAt?.getTime() || now;
  if (state?.windowStartAt && now - windowStartAt > WINDOW_MS) {
    failedAttempts = 0;
    await prisma.loginAbuseState.upsert({
      where: { email: normalized },
      update: { failedAttempts: 0, windowStartAt: new Date(now), lockoutUntil: null },
      create: { email: normalized, failedAttempts: 0, windowStartAt: new Date(now), lockoutUntil: null },
    });
  }

  if (failedAttempts >= EMAIL_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      status: 429,
      message: 'Too many failed attempts for this account. Please try again later.',
    };
  }

  return { allowed: true };
}

export async function registerFailedLogin(email: string, now = Date.now()): Promise<{ locked: boolean }> {
  const normalized = normalizeEmail(email);
  const state = await prisma.loginAbuseState.findUnique({ where: { email: normalized } });

  const isWindowExpired = !state?.windowStartAt || now - state.windowStartAt.getTime() > WINDOW_MS;
  const failedAttempts = (isWindowExpired ? 0 : state?.failedAttempts || 0) + 1;
  const lockoutUntil = failedAttempts >= EMAIL_LOCKOUT_THRESHOLD ? new Date(now + LOCKOUT_MS) : null;

  await prisma.loginAbuseState.upsert({
    where: { email: normalized },
    update: {
      failedAttempts,
      windowStartAt: isWindowExpired ? new Date(now) : state?.windowStartAt,
      lockoutUntil,
    },
    create: {
      email: normalized,
      failedAttempts,
      windowStartAt: new Date(now),
      lockoutUntil,
    },
  });

  if (failedAttempts >= EMAIL_LOCKOUT_THRESHOLD) {
    return { locked: true };
  }

  return { locked: false };
}

export async function registerSuccessfulLogin(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await prisma.loginAbuseState.deleteMany({ where: { email: normalized } });
}
