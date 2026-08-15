import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../database/prisma';
import { AppError } from '../../../common/errors/AppError';
import { logger } from '../../../common/utils/logger';
import { sendNotification } from '../../notifications/services/notification.service';

export class AuthResetService {
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private resolveFrontendUrl(clientOrigin?: string): string {
    const raw = clientOrigin || process.env.FRONTEND_URL || 'http://localhost:3000';
    return raw.replace(/\/+$/, '');
  }

  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string, clientOrigin?: string): Promise<{ success: boolean; message: string; resetUrl?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const genericResponse = {
      success: true,
      message: 'If an active staff account is associated with this email, a password reset link has been dispatched.',
    };

    const user = await prisma.adminUser.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    });

    if (!user || !user.isActive) {
      return genericResponse;
    }

    // Rate-limiting: Max 3 active reset tokens generated in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentTokensCount = await prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (recentTokensCount >= 5) {
      logger.warn({ userId: user.id, email: normalizedEmail }, 'Rate limit exceeded for staff password reset requests');
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes validity

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    const frontendUrl = this.resolveFrontendUrl(clientOrigin);
    const resetUrl = `${frontendUrl}/admin/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Log the link in server output for development convenience
    logger.info({ email: user.email, resetUrl }, 'Staff password reset link generated');

    // Dispatch email notification asynchronously
    setImmediate(() => {
      sendNotification({
        to: user.email,
        subject: 'Zemen SACCO - Staff Password Reset',
        message: `Dear ${user.name},\n\nA password reset request was initiated for your Zemen SACCO staff account.\n\nPlease click the following link to set your new password:\n${resetUrl}\n\nSecurity Notice:\n- This link is valid for 30 minutes and can only be used once.\n- If you did not make this request, please inform your system administrator immediately.\n\nThank you,\nZemen SACCO Security Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800;">ZEMEN SACCO</h2>
              <p style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 4px; letter-spacing: 1px;">Institutional Staff Portal</p>
            </div>
            <div style="padding: 20px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
              <p style="font-size: 15px; color: #1e293b; margin: 0 0 12px;">Dear <strong>${user.name}</strong>,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
                A password reset request was submitted for your staff account. Click the secure button below to set your new password:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  Reset My Password
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 16px 0 0;">
                If the button above does not work, copy and paste this URL into your browser:<br/>
                <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            <div style="margin-top: 20px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0;">• This link is valid for <strong>30 minutes</strong>.</p>
              <p style="margin: 4px 0 0;">• If you did not request this reset, please notify your administrator immediately.</p>
            </div>
          </div>
        `,
        channel: 'EMAIL',
      }).catch((err) => {
        logger.error({ err, email: user.email }, 'Failed to dispatch staff password reset email');
      });
    });

    return {
      ...genericResponse,
      ...(process.env.NODE_ENV !== 'production' ? { resetUrl } : {}),
    };
  }

  async verifyResetToken(token: string, email: string): Promise<{ valid: boolean; email: string; name: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.adminUser.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user || !user.isActive) {
      throw new AppError('Password reset link is invalid or the account is inactive.', 400);
    }

    const tokenHash = this.hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new AppError('This password reset link is invalid, expired, or has already been used.', 400);
    }

    return {
      valid: true,
      email: user.email,
      name: user.name,
    };
  }

  async completePasswordReset(token: string, email: string, newPassword: string, ipAddress?: string): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters in length.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.adminUser.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user || !user.isActive) {
      throw new AppError('Password reset link is invalid or the account is inactive.', 400);
    }

    const tokenHash = this.hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new AppError('This password reset link is invalid, expired, or has already been used.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      // 1. Update user password
      await tx.adminUser.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // 2. Mark all reset tokens for this user as used
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // 3. Revoke active auth sessions to terminate unauthorized sessions
      await tx.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'STAFF_PASSWORD_RESET_COMPLETED',
          targetType: 'AdminUser',
          targetId: user.id,
          details: `Password reset successfully completed for ${user.email}`,
          ipAddress: ipAddress || null,
        },
      });
    });

    return {
      success: true,
      message: 'Password reset completed successfully. You can now log in with your new password.',
    };
  }

  async adminTriggerResetLink(userId: string, executorId: string, clientOrigin?: string): Promise<{ success: boolean; message: string; resetUrl: string }> {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours for admin-initiated links

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.resolveFrontendUrl(clientOrigin);
    const resetUrl = `${frontendUrl}/admin/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch email
    setImmediate(() => {
      sendNotification({
        to: user.email,
        subject: 'Zemen SACCO - Password Setup / Reset Link',
        message: `Dear ${user.name},\n\nAn administrator has generated a secure password setup / reset link for your Zemen SACCO account.\n\nPlease click the link below to set your password:\n${resetUrl}\n\nThank you,\nZemen SACCO Security Team`,
        channel: 'EMAIL',
      }).catch((err) => {
        logger.error({ err, email: user.email }, 'Failed to send admin-triggered reset email');
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: executorId,
        action: 'STAFF_PASSWORD_RESET_LINK_DISPATCHED',
        targetType: 'AdminUser',
        targetId: user.id,
        details: `Administrator generated password reset link for ${user.email}`,
      },
    });

    return {
      success: true,
      message: `Password reset link dispatched to ${user.email}`,
      resetUrl,
    };
  }
}

export const authResetService = new AuthResetService();
