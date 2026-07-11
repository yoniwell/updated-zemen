import prisma from '../config/database';

export async function storeRefreshSession(tokenId: string, userId: string, expiresAt: number): Promise<void> {
  const expiry = new Date(expiresAt);
  await prisma.authSession.upsert({
    where: { tokenId },
    update: { userId, expiresAt: expiry, revokedAt: null },
    create: { tokenId, userId, expiresAt: expiry },
  });
}

export async function isRefreshSessionActive(tokenId: string, userId: string): Promise<boolean> {
  const session = await prisma.authSession.findFirst({
    where: {
      tokenId,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { tokenId: true },
  });

  return Boolean(session);
}

export async function revokeRefreshSession(tokenId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserRefreshSessions(userId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
