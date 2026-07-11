import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import prisma from '../config/database';
import { authenticate, AuthRequest, getJwtSecret } from '../middleware/auth';
import { recordSecurityEvent } from '../services/security-monitor.service';
import { evaluateLoginAttempt, registerFailedLogin, registerSuccessfulLogin } from '../services/login-abuse.service';
import { isRefreshSessionActive, revokeRefreshSession, storeRefreshSession } from '../services/session.service';
import { buildAuthCookieOptions } from '../utils/auth-cookies';

const router = Router();
const accessTokenTtlMs = 24 * 60 * 60 * 1000;
const refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000;
const inviteTokenPrefix = 'invite.token.';
const csrfCookieName = 'zemen_csrf_token';

type InviteTokenPayload = {
  userId: string;
  email: string;
  expiresAt: string;
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: string;
  emailVerifiedAt?: string | null;
};

const parseCookieValue = (cookieHeader: string | undefined, cookieName: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((entry) => entry.trim());
  const tokenCookie = cookies.find((entry) => entry.startsWith(`${cookieName}=`));
  if (!tokenCookie) {
    return null;
  }

  return decodeURIComponent(tokenCookie.replace(`${cookieName}=`, ''));
};

const ensureCsrfToken = (req: Request, res: Response): string => {
  const existing = parseCookieValue(req.headers.cookie, csrfCookieName);
  if (existing) {
    return existing;
  }

  const token = randomBytes(24).toString('hex');
  res.cookie(csrfCookieName, token, buildAuthCookieOptions({ httpOnly: false }));
  return token;
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]);
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const signAccessToken = (user: { id: string; email: string; role: string }): string => {
  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '24h',
  };

  return jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), signOptions);
};

const signRefreshToken = (user: { id: string; email: string; role: string }, tokenId: string): string => {
  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']) || '7d',
    jwtid: tokenId,
  };

  return jwt.sign({ id: user.id, email: user.email, role: user.role, tokenType: 'refresh' }, getJwtSecret(), signOptions);
};

const isValidInviteTokenFormat = (token: string): boolean => /^[a-f0-9]{48}$/i.test(token);

const parseInviteTokenPayload = (raw: string): InviteTokenPayload | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<InviteTokenPayload>;
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      !parsed.userId.trim() ||
      !parsed.email.trim() ||
      !parsed.expiresAt.trim()
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      expiresAt: parsed.expiresAt,
      emailVerificationToken:
        typeof parsed.emailVerificationToken === 'string' ? parsed.emailVerificationToken : undefined,
      emailVerificationExpiresAt:
        typeof parsed.emailVerificationExpiresAt === 'string' ? parsed.emailVerificationExpiresAt : undefined,
      emailVerifiedAt: typeof parsed.emailVerifiedAt === 'string' || parsed.emailVerifiedAt === null ? parsed.emailVerifiedAt : null,
    };
  } catch {
    return null;
  }
};

const readInviteTokenRecord = async (
  token: string
): Promise<{ key: string; payload: InviteTokenPayload } | null> => {
  const key = `${inviteTokenPrefix}${token}`;
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  if (!setting) {
    return null;
  }

  const payload = parseInviteTokenPayload(setting.value);
  if (!payload) {
    await prisma.systemSetting.delete({ where: { key } }).catch(() => undefined);
    return null;
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    await prisma.systemSetting.delete({ where: { key } }).catch(() => undefined);
    return null;
  }

  return { key, payload };
};

const persistInviteTokenPayload = async (key: string, payload: InviteTokenPayload): Promise<void> => {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(payload) },
    create: { key, value: JSON.stringify(payload) },
  });
};

// GET /api/auth/csrf-token
router.get('/csrf-token', (req: Request, res: Response): void => {
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ csrfToken });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberDevice } = req.body;
    const persistSession = rememberDevice !== false;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const guard = await evaluateLoginAttempt(String(email));
    if (!guard.allowed) {
      await recordSecurityEvent({
        endpoint: 'login',
        eventType: guard.status === 423 ? 'LOGIN_ACCOUNT_LOCKED' : 'LOGIN_ACCOUNT_RATE_LIMITED',
        ipAddress: getClientIp(req),
        details: `email=${String(email).trim().toLowerCase().slice(0, 120)}`,
      });
      res.status(guard.status).json({ error: guard.message });
      return;
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
      include: { branch: true },
    });

    if (!user || !user.isActive) {
      const lockoutState = await registerFailedLogin(String(email));
      await recordSecurityEvent({
        endpoint: 'login',
        eventType: 'LOGIN_FAILED',
        ipAddress: getClientIp(req),
        details: `email=${String(email).slice(0, 120)}`,
      });
      if (lockoutState.locked) {
        await recordSecurityEvent({
          endpoint: 'login',
          eventType: 'LOGIN_ACCOUNT_LOCKED',
          ipAddress: getClientIp(req),
          details: `email=${String(email).trim().toLowerCase().slice(0, 120)}`,
        });
      }
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const lockoutState = await registerFailedLogin(user.email);
      await recordSecurityEvent({
        endpoint: 'login',
        eventType: 'LOGIN_FAILED',
        ipAddress: getClientIp(req),
        details: `email=${user.email}`,
      });
      if (lockoutState.locked) {
        await recordSecurityEvent({
          endpoint: 'login',
          eventType: 'LOGIN_ACCOUNT_LOCKED',
          ipAddress: getClientIp(req),
          details: `email=${user.email}`,
        });
      }
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await registerSuccessfulLogin(user.email);

    // Update last login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = signAccessToken(user);
    const refreshTokenId = randomUUID();
    const refreshToken = signRefreshToken(user, refreshTokenId);
    await storeRefreshSession(refreshTokenId, user.id, Date.now() + refreshTokenTtlMs);

    res.cookie(
      'zemen_admin_token',
      token,
      buildAuthCookieOptions({ httpOnly: true, ...(persistSession ? { maxAge: accessTokenTtlMs } : {}) })
    );

    res.cookie(
      'zemen_admin_refresh',
      refreshToken,
      buildAuthCookieOptions({ httpOnly: true, ...(persistSession ? { maxAge: refreshTokenTtlMs } : {}) })
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  const refreshToken = parseCookieValue(_req.headers.cookie, 'zemen_admin_refresh');
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, getJwtSecret()) as { jti?: string };
      if (decoded.jti) {
        await revokeRefreshSession(decoded.jti);
      }
    } catch {
      // Ignore malformed or expired refresh token on logout.
    }
  }

  res.clearCookie('zemen_admin_token', buildAuthCookieOptions({ httpOnly: true }));
  res.clearCookie('zemen_admin_refresh', buildAuthCookieOptions({ httpOnly: true }));
  res.clearCookie('zemen_csrf_token', buildAuthCookieOptions({ httpOnly: false }));
  res.json({ success: true });
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = parseCookieValue(req.headers.cookie, 'zemen_admin_refresh');
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token is required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, getJwtSecret()) as {
      id: string;
      email: string;
      role: string;
      tokenType?: string;
      jti?: string;
    };

    if (decoded.tokenType !== 'refresh' || !decoded.jti) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    if (!(await isRefreshSessionActive(decoded.jti, decoded.id))) {
      res.status(401).json({ error: 'Refresh session is no longer active' });
      return;
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      include: { branch: true },
    });

    if (!user || !user.isActive) {
      await revokeRefreshSession(decoded.jti);
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    await revokeRefreshSession(decoded.jti);

    const nextRefreshTokenId = randomUUID();
    const nextAccessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user, nextRefreshTokenId);

    await storeRefreshSession(nextRefreshTokenId, user.id, Date.now() + refreshTokenTtlMs);

    res.cookie('zemen_admin_token', nextAccessToken, buildAuthCookieOptions({ httpOnly: true, maxAge: accessTokenTtlMs }));

    res.cookie('zemen_admin_refresh', nextRefreshToken, buildAuthCookieOptions({ httpOnly: true, maxAge: refreshTokenTtlMs }));

    res.json({
      token: nextAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (error) {
    console.error('Refresh session error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// GET /api/auth/invite/:token
router.get('/invite/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidInviteTokenFormat(token)) {
      res.status(400).json({ error: 'Invalid invite token format' });
      return;
    }

    const inviteRecord = await readInviteTokenRecord(token);
    if (!inviteRecord) {
      res.status(404).json({ error: 'Invite token is invalid or expired' });
      return;
    }

    const invitedUser = await prisma.adminUser.findUnique({
      where: { id: inviteRecord.payload.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    if (!invitedUser || !invitedUser.isActive || invitedUser.email !== inviteRecord.payload.email) {
      await prisma.systemSetting.delete({ where: { key: inviteRecord.key } }).catch(() => undefined);
      res.status(404).json({ error: 'Invite token is invalid or expired' });
      return;
    }

    res.json({
      valid: true,
      email: inviteRecord.payload.email,
      expiresAt: inviteRecord.payload.expiresAt,
      emailVerified: Boolean(inviteRecord.payload.emailVerifiedAt),
    });
  } catch (error) {
    console.error('Invite token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/invite/:token/verify-email
router.post('/invite/:token/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token || '').trim();
    const verificationToken = typeof req.body?.verificationToken === 'string' ? req.body.verificationToken.trim() : '';

    if (!isValidInviteTokenFormat(token)) {
      res.status(400).json({ error: 'Invalid invite token format' });
      return;
    }

    if (!/^[a-f0-9]{32}$/i.test(verificationToken)) {
      res.status(400).json({ error: 'Invalid verification token format' });
      return;
    }

    const inviteRecord = await readInviteTokenRecord(token);
    if (!inviteRecord) {
      res.status(404).json({ error: 'Invite token is invalid or expired' });
      return;
    }

    const verificationExpiresAt = inviteRecord.payload.emailVerificationExpiresAt || inviteRecord.payload.expiresAt;
    if (new Date(verificationExpiresAt).getTime() <= Date.now()) {
      await prisma.systemSetting.delete({ where: { key: inviteRecord.key } }).catch(() => undefined);
      res.status(404).json({ error: 'Invite token is invalid or expired' });
      return;
    }

    if (!inviteRecord.payload.emailVerificationToken || inviteRecord.payload.emailVerificationToken !== verificationToken) {
      res.status(401).json({ error: 'Invalid verification token' });
      return;
    }

    const invitedUser = await prisma.adminUser.findUnique({
      where: { id: inviteRecord.payload.userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!invitedUser || !invitedUser.isActive || invitedUser.email !== inviteRecord.payload.email) {
      await prisma.systemSetting.delete({ where: { key: inviteRecord.key } }).catch(() => undefined);
      res.status(404).json({ error: 'Invite token is invalid or expired' });
      return;
    }

    const verifiedAt = new Date().toISOString();
    const nextPayload: InviteTokenPayload = {
      ...inviteRecord.payload,
      emailVerifiedAt: verifiedAt,
      emailVerificationToken: undefined,
      emailVerificationExpiresAt: undefined,
    };

    await persistInviteTokenPayload(inviteRecord.key, nextPayload);
    await prisma.systemSetting.upsert({
      where: { key: `admin.email_verified.${invitedUser.id}` },
      update: { value: verifiedAt },
      create: { key: `admin.email_verified.${invitedUser.id}`, value: verifiedAt },
    });

    await prisma.auditLog.create({
      data: {
        userId: invitedUser.id,
        action: 'USER_INVITE_EMAIL_VERIFIED',
        targetType: 'ADMIN_USER',
        targetId: invitedUser.id,
        details: `Invitation email verified for ${invitedUser.email}`,
        ipAddress: getClientIp(req),
      },
    });

    res.json({ success: true, emailVerifiedAt: verifiedAt });
  } catch (error) {
    console.error('Invite email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/invite/accept
router.post('/invite/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidInviteTokenFormat(token)) {
      res.status(400).json({ error: 'Invalid invite token format' });
      return;
    }

    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
      return;
    }

    const inviteRecord = await readInviteTokenRecord(token);
    if (!inviteRecord) {
      res.status(404).json({ error: 'Invite token is invalid or expired' });
      return;
    }

    const invitedUser = await prisma.adminUser.findUnique({
      where: { id: inviteRecord.payload.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    if (!invitedUser || !invitedUser.isActive || invitedUser.email !== inviteRecord.payload.email) {
      await prisma.systemSetting.delete({ where: { key: inviteRecord.key } }).catch(() => undefined);
      res.status(404).json({ error: 'Invite token is invalid or expired' });
      return;
    }

    if (!inviteRecord.payload.emailVerifiedAt) {
      res.status(403).json({ error: 'Invitation email must be verified before account activation' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: invitedUser.id },
        data: { passwordHash },
      }),
      prisma.systemSetting.delete({ where: { key: inviteRecord.key } }),
      prisma.auditLog.create({
        data: {
          userId: invitedUser.id,
          action: 'USER_INVITE_ACCEPTED',
          targetType: 'ADMIN_USER',
          targetId: invitedUser.id,
          details: `Admin invite accepted for ${invitedUser.email}`,
          ipAddress: getClientIp(req),
        },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Invite acceptance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user!.id },
      include: { branch: true },
      omit: { passwordHash: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
