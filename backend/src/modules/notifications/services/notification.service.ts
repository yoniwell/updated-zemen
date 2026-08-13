import nodemailer from 'nodemailer';
import { logger } from '../../../common/utils/logger';

type NotificationPayload = {
  to: string;
  subject: string;
  message: string;
  channel: 'EMAIL' | 'SMS';
};

let cachedTransporter: nodemailer.Transporter | null = null;

const isEmailEnabled = (): boolean => {
  const explicitFlag = process.env.EMAIL_ENABLED;
  if (explicitFlag === 'true') {
    return true;
  }

  if (explicitFlag === 'false') {
    return false;
  }

  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

const getTransporter = (): nodemailer.Transporter | null => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_SMTP_PORT || 465);

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 14,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    family: 4, // Force IPv4 to bypass 30-45s Node.js IPv6 DNS lookup delays
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  } as any);

  return cachedTransporter;
};

/**
 * Call this once on server startup to open the SMTP connection pool early,
 * so the first OTP email is delivered without any cold-start delay.
 */
export async function prewarmSmtp(): Promise<void> {
  if (!isEmailEnabled()) return;
  const transporter = getTransporter();
  if (!transporter) return;

  try {
    await transporter.verify();
    logger.info('SMTP connection pre-warmed successfully');

    // Keep the pool alive by sending a NOOP every 30 seconds
    setInterval(() => {
      (transporter as any).sendCommand?.('NOOP').catch(() => {});
    }, 30_000);
  } catch (err) {
    logger.warn({ err }, 'SMTP pre-warm failed — emails will still be attempted on demand');
  }
}

const buildFromAddress = (): string => {
  const fromName = process.env.EMAIL_FROM_NAME || 'Zemen SACCO';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'no-reply@localhost';
  return `"${fromName}" <${fromAddress}>`;
};

const templates = {
  submissionConfirmation: (referenceNo: string) => ({
    subject: 'Application Submitted',
    message: `Your application has been submitted successfully. Reference: ${referenceNo}`,
  }),
  infoRequest: (referenceNo: string) => ({
    subject: 'More Information Required',
    message: `Additional information is required for application ${referenceNo}.`,
  }),
  approval: (referenceNo: string) => ({
    subject: 'Application Approved',
    message: `Congratulations. Application ${referenceNo} is approved.`,
  }),
  rejection: (referenceNo: string) => ({
    subject: 'Application Rejected',
    message: `Application ${referenceNo} has been rejected after review.`,
  }),
};

const buildRecipientName = (name: string): string => {
  const normalized = name.trim();
  return normalized.length > 0 ? normalized : 'Applicant';
};

export function buildMembershipApprovedTemplate(name: string): { subject: string; message: string } {
  const recipientName = buildRecipientName(name);
  return {
    subject: 'Membership Approved',
    message: `Dear ${recipientName},\n\nCongratulations!\n\nYour membership application has been reviewed and approved by our officer.\n\nWe are happy to have you with us.\n\nBest regards,\nZemen SACCO`,
  };
}

export function buildMembershipSubmittedTemplate(name: string, referenceNo: string): { subject: string; message: string } {
  const recipientName = buildRecipientName(name);
  return {
    subject: 'Membership Application Submitted',
    message: `Dear ${recipientName},\n\nYour membership application has been successfully submitted.\n\nReference Number: ${referenceNo}\n\nOur team will review it and get back to you shortly.\n\nBest regards,\nZemen SACCO`,
  };
}

export function buildLoanSubmittedTemplate(name: string, referenceNo: string): { subject: string; message: string } {
  const recipientName = buildRecipientName(name);
  return {
    subject: 'Loan Application Submitted',
    message: `Dear ${recipientName},\n\nYour loan application has been successfully submitted.\n\nReference Number: ${referenceNo}\n\nOur team will review your request and get back to you shortly.\n\nThank you for choosing us.\n\nBest regards,\nZemen SACCO`,
  };
}

export function buildLoanApprovedTemplate(name: string): { subject: string; message: string } {
  const recipientName = buildRecipientName(name);
  return {
    subject: 'Loan Approved',
    message: `Dear ${recipientName},\n\nGreat news!\n\nYour loan application has been approved successfully.\n\nPlease contact our office for the next steps.\n\nBest regards,\nZemen SACCO`,
  };
}

export async function sendNotification(payload: NotificationPayload): Promise<{ queued: boolean }> {
  if (payload.channel !== 'EMAIL') {
    logger.warn({ channel: payload.channel, to: payload.to }, 'notification_channel_not_supported');
    return { queued: false };
  }

  if (!isEmailEnabled()) {
    logger.info({ to: payload.to, subject: payload.subject }, 'email_delivery_skipped_not_enabled');
    return { queued: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    logger.warn({ to: payload.to, subject: payload.subject }, 'email_delivery_skipped_missing_credentials');
    return { queued: true };
  }

  try {
    const startTime = Date.now();
    logger.info({ to: payload.to, subject: payload.subject }, 'email_sending_started');
    const info = await transporter.sendMail({
      from: buildFromAddress(),
      to: payload.to,
      subject: payload.subject,
      text: payload.message,
    });

    const durationMs = Date.now() - startTime;
    logger.info({ to: payload.to, subject: payload.subject, durationMs, messageId: info.messageId }, `Email delivered to SMTP server in ${durationMs}ms`);
    return { queued: true };
  } catch (error) {
    logger.error({ err: error, to: payload.to, subject: payload.subject }, 'email_send_failed');
    return { queued: false };
  }
}

export function buildTemplate(name: keyof typeof templates, referenceNo: string): { subject: string; message: string } {
  return templates[name](referenceNo);
}
