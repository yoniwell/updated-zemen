import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class AuthRepository {
  private db: PrismaClient = prisma;

  async findUserByEmail(email: string) {
    return this.db.adminUser.findUnique({
      where: { email },
      include: { branch: true },
    });
  }

  async findUserById(id: string) {
    return this.db.adminUser.findUnique({
      where: { id },
      include: { branch: true },
    });
  }

  async updateUserLastLogin(id: string) {
    await this.db.adminUser.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  async updateUserPassword(id: string, passwordHash: string) {
    await this.db.adminUser.update({
      where: { id },
      data: { passwordHash },
    });
  }

  // Login Abuse
  async findLoginAbuseState(email: string) {
    return this.db.loginAbuseState.findUnique({ where: { email } });
  }

  async clearLockout(email: string) {
    await this.db.loginAbuseState.update({
      where: { email },
      data: { lockoutUntil: null },
    });
  }

  async upsertLoginAbuseState(email: string, failedAttempts: number, windowStartAt: Date, lockoutUntil: Date | null) {
    return this.db.loginAbuseState.upsert({
      where: { email },
      update: { failedAttempts, windowStartAt, lockoutUntil },
      create: { email, failedAttempts, windowStartAt, lockoutUntil },
    });
  }

  async deleteLoginAbuseState(email: string) {
    await this.db.loginAbuseState.deleteMany({ where: { email } });
  }

  // System Settings (Tokens & Sessions)
  async getSystemSetting(key: string) {
    return this.db.systemSetting.findUnique({ where: { key } });
  }

  async upsertSystemSetting(key: string, value: string) {
    await this.db.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async deleteSystemSetting(key: string) {
    await this.db.systemSetting.delete({ where: { key } }).catch(() => undefined);
  }

  // Audit Logs
  async createAuditLog(data: any) {
    await this.db.auditLog.create({ data });
  }

  // Transaction support
  async executeTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.db.$transaction(fn);
  }
}
