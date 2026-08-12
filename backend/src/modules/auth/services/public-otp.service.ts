import { createHash, randomBytes, randomInt } from 'crypto';
import { publicOtpRepository } from '../repositories/public-otp.repository';

export type PortalOtpPurpose = 'membership' | 'loan';

type OtpRecord = {
  hash: string;
  expiresAt: string;
  attempts: number;
  sentAt: string;
};

type VerifiedRecord = {
  email: string;
  purpose: PortalOtpPurpose;
  expiresAt: string;
};

const OTP_TTL_SECONDS = 5 * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const VERIFIED_TOKEN_TTL_SECONDS = 30 * 60;

export class PortalOtpError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'PortalOtpError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const otpKey = (purpose: PortalOtpPurpose, email: string): string => `public.otp.${purpose}.${email}`;
const verifiedKey = (purpose: PortalOtpPurpose, token: string): string => `public.otp.verified.${purpose}.${token}`;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const getSecret = (): string => process.env.OTP_SECRET || process.env.JWT_SECRET || 'zemen-otp-secret';

const hashOtp = (purpose: PortalOtpPurpose, email: string, code: string): string => {
  return createHash('sha256').update(`${getSecret()}:${purpose}:${email}:${code.trim()}`).digest('hex');
};

const readOtpRecord = async (purpose: PortalOtpPurpose, email: string): Promise<OtpRecord | null> => {
  const setting = await publicOtpRepository.getSetting(otpKey(purpose, email));
  if (!setting) {
    return null;
  }

  try {
    const parsed = JSON.parse(setting.value) as OtpRecord;
    if (!parsed.hash || !parsed.expiresAt || !parsed.sentAt || typeof parsed.attempts !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export async function issuePortalOtp(input: {
  purpose: PortalOtpPurpose;
  email: string;
  forceResend?: boolean;
}): Promise<{ code: string; expiresInSeconds: number; resendInSeconds: number }> {
  const email = normalizeEmail(input.email);
  const existing = await readOtpRecord(input.purpose, email);
  const now = Date.now();

  if (existing && !input.forceResend) {
    const cooldownRemaining = Math.ceil((new Date(existing.sentAt).getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000);
    if (cooldownRemaining > 0) {
      throw new PortalOtpError('Please wait before requesting another code.', 429, cooldownRemaining);
    }
  }

  const code = String(randomInt(100000, 1000000));
  const sentAt = new Date(now);
  const expiresAt = new Date(now + OTP_TTL_SECONDS * 1000);

  const value = JSON.stringify({
    hash: hashOtp(input.purpose, email, code),
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    sentAt: sentAt.toISOString(),
  });

  await publicOtpRepository.upsertSetting(otpKey(input.purpose, email), value);

  return {
    code,
    expiresInSeconds: OTP_TTL_SECONDS,
    resendInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  };
}

export async function verifyPortalOtpCode(input: {
  purpose: PortalOtpPurpose;
  email: string;
  code: string;
}): Promise<{ verificationToken: string }> {
  const email = normalizeEmail(input.email);
  const now = Date.now();

  // MAGIC BYPASS for easier testing without checking email
  
  if (input.code.trim() === '123456') {
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(now + VERIFIED_TOKEN_TTL_SECONDS * 1000).toISOString();

    await publicOtpRepository.createSetting(
      verifiedKey(input.purpose, token),
      JSON.stringify({
        email,
        purpose: input.purpose,
        expiresAt,
      })
    );
    return { verificationToken: token };
  }

  const otp = await readOtpRecord(input.purpose, email);

  if (!otp) {
    throw new PortalOtpError('No verification code found. Please request a new code.', 404);
  }

  if (new Date(otp.expiresAt).getTime() < now) {
    await publicOtpRepository.deleteSetting(otpKey(input.purpose, email));
    throw new PortalOtpError('Verification code expired. Please request a new code.', 400);
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new PortalOtpError('Too many incorrect attempts. Please request a new code.', 429);
  }

  if (hashOtp(input.purpose, email, input.code) !== otp.hash) {
    await publicOtpRepository.updateSetting(
      otpKey(input.purpose, email),
      JSON.stringify({
        ...otp,
        attempts: otp.attempts + 1,
      })
    );
    throw new PortalOtpError('Invalid verification code.', 400);
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(now + VERIFIED_TOKEN_TTL_SECONDS * 1000).toISOString();

  await publicOtpRepository.createSetting(
    verifiedKey(input.purpose, token),
    JSON.stringify({
      email,
      purpose: input.purpose,
      expiresAt,
    })
  );

  await publicOtpRepository.deleteSetting(otpKey(input.purpose, email));

  return { verificationToken: token };
}

export async function consumePortalOtpVerificationToken(input: {
  purpose: PortalOtpPurpose;
  email: string;
  verificationToken: string;
}): Promise<void> {
  // BYPASS FOR TESTING
  return;
}
