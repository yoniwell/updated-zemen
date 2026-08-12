import { sessionRepository } from '../repositories/session.repository';

export async function storeRefreshSession(tokenId: string, userId: string, expiresAt: number): Promise<void> {
  const expiry = new Date(expiresAt);
  await sessionRepository.upsertSession(tokenId, userId, expiry);
}

export async function isRefreshSessionActive(tokenId: string, userId: string): Promise<boolean> {
  const session = await sessionRepository.findActiveSession(tokenId, userId);
  return Boolean(session);
}

export async function revokeRefreshSession(tokenId: string): Promise<void> {
  await sessionRepository.revokeSession(tokenId);
}

export async function revokeUserRefreshSessions(userId: string): Promise<void> {
  await sessionRepository.revokeAllUserSessions(userId);
}
