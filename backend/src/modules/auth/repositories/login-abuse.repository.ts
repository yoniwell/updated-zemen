import prisma from '../../../config/database';
import { LoginAbuseState } from '@prisma/client';

export class LoginAbuseRepository {
  async getLoginAbuseState(email: string) {
    return prisma.loginAbuseState.findUnique({ where: { email } });
  }

  async clearLockout(email: string): Promise<void> {
    await prisma.loginAbuseState.update({
      where: { email },
      data: { lockoutUntil: null },
    });
  }

  async resetWindow(email: string, now: number): Promise<void> {
    await prisma.loginAbuseState.upsert({
      where: { email },
      update: { failedAttempts: 0, windowStartAt: new Date(now), lockoutUntil: null },
      create: { email, failedAttempts: 0, windowStartAt: new Date(now), lockoutUntil: null },
    });
  }

  async upsertState(
    email: string,
    failedAttempts: number,
    windowStartAt: Date | null | undefined,
    lockoutUntil: Date | null
  ): Promise<void> {
    await prisma.loginAbuseState.upsert({
      where: { email },
      update: {
        failedAttempts,
        windowStartAt,
        lockoutUntil,
      },
      create: {
        email,
        failedAttempts,
        windowStartAt: windowStartAt || new Date(),
        lockoutUntil,
      },
    });
  }

  async deleteState(email: string): Promise<void> {
    await prisma.loginAbuseState.deleteMany({ where: { email } });
  }
}

export const loginAbuseRepository = new LoginAbuseRepository();
