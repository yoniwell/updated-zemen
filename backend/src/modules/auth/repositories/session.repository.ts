import prisma from '../../../config/database';

export class SessionRepository {
  async upsertSession(tokenId: string, userId: string, expiresAt: Date): Promise<void> {
    await prisma.authSession.upsert({
      where: { tokenId },
      update: { userId, expiresAt, revokedAt: null },
      create: { tokenId, userId, expiresAt },
    });
  }

  async findActiveSession(tokenId: string, userId: string) {
    return prisma.authSession.findFirst({
      where: {
        tokenId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { tokenId: true },
    });
  }

  async revokeSession(tokenId: string): Promise<void> {
    await prisma.authSession.updateMany({
      where: { tokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const sessionRepository = new SessionRepository();
