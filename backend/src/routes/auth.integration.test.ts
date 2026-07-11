import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import authRoutes from './auth.routes';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

type MockInvitePayload = {
  userId: string;
  email: string;
  expiresAt: string;
  emailVerificationToken?: string;
  emailVerifiedAt?: string | null;
};

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

const original = {
  adminUserFindUnique: prisma.adminUser.findUnique,
  adminUserUpdate: prisma.adminUser.update,
  systemSettingFindUnique: prisma.systemSetting.findUnique,
  systemSettingDelete: prisma.systemSetting.delete,
  systemSettingUpsert: prisma.systemSetting.upsert,
  auditLogCreate: prisma.auditLog.create,
  transaction: prisma.$transaction,
};

const restorePrisma = () => {
  prisma.adminUser.findUnique = original.adminUserFindUnique;
  prisma.adminUser.update = original.adminUserUpdate;
  prisma.systemSetting.findUnique = original.systemSettingFindUnique;
  prisma.systemSetting.delete = original.systemSettingDelete;
  prisma.systemSetting.upsert = original.systemSettingUpsert;
  prisma.auditLog.create = original.auditLogCreate;
  prisma.$transaction = original.transaction;
};

const installInviteMocks = (params?: {
  invitePayload?: MockInvitePayload | null;
  user?: { id: string; email: string; isActive: boolean } | null;
}) => {
  const inviteStore = new Map<string, string>();
  const updatePayloads: Array<{ where: { id: string }; data: { passwordHash: string } }> = [];
  const auditActions: string[] = [];

  const token = 'a'.repeat(48);
  const key = `invite.token.${token}`;

  if (params?.invitePayload !== null) {
    const payload: MockInvitePayload =
      params?.invitePayload ||
      {
        userId: 'invited-user-1',
        email: 'invitee@example.com',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        emailVerificationToken: 'b'.repeat(32),
        emailVerifiedAt: null,
      };

    inviteStore.set(key, JSON.stringify(payload));
  }

  const invitedUser =
    params?.user === undefined
      ? { id: 'invited-user-1', email: 'invitee@example.com', isActive: true }
      : params.user;

  prisma.systemSetting.findUnique = (async ({ where }: { where: { key: string } }) => {
    const value = inviteStore.get(where.key);
    return value ? { key: where.key, value } : null;
  }) as unknown as typeof prisma.systemSetting.findUnique;

  prisma.systemSetting.delete = (async ({ where }: { where: { key: string } }) => {
    inviteStore.delete(where.key);
    return { key: where.key, value: '' };
  }) as unknown as typeof prisma.systemSetting.delete;

  prisma.systemSetting.upsert = (async ({ where, update, create }: { where: { key: string }; update: { value: string }; create: { key: string; value: string } }) => {
    const nextValue = inviteStore.has(where.key) ? update.value : create.value;
    inviteStore.set(where.key, nextValue);
    return { key: where.key, value: nextValue, createdAt: new Date(), updatedAt: new Date() };
  }) as unknown as typeof prisma.systemSetting.upsert;

  prisma.adminUser.findUnique = (async ({ where }: { where: { id: string } }) => {
    if (!invitedUser || invitedUser.id !== where.id) {
      return null;
    }
    return invitedUser;
  }) as unknown as typeof prisma.adminUser.findUnique;

  prisma.adminUser.update = (async ({ where, data }: { where: { id: string }; data: { passwordHash: string } }) => {
    updatePayloads.push({ where, data });
    return {
      id: where.id,
      email: invitedUser?.email || 'unknown@example.com',
      role: 'BRANCH_MANAGER',
      branchId: null,
      name: 'Invited User',
      isActive: true,
      passwordHash: data.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
    };
  }) as unknown as typeof prisma.adminUser.update;

  prisma.auditLog.create = (async ({ data }: { data: { action: string } }) => {
    auditActions.push(data.action);
    return { id: 'audit-1' };
  }) as unknown as typeof prisma.auditLog.create;

  prisma.$transaction = (async <T>(ops: Promise<T>[]) => Promise.all(ops)) as typeof prisma.$transaction;

  return { token, inviteStore, updatePayloads, auditActions };
};

test.afterEach(() => {
  restorePrisma();
});

test('integration: invite token details endpoint returns email and expiry for valid token', async () => {
  const { token } = installInviteMocks();
  const app = createTestApp();

  const response = await request(app).get(`/api/auth/invite/${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.valid, true);
  assert.equal(response.body.email, 'invitee@example.com');
  assert.equal(typeof response.body.expiresAt, 'string');
});

test('integration: invite acceptance sets password and consumes token', async () => {
  const { token, inviteStore, updatePayloads, auditActions } = installInviteMocks();
  const app = createTestApp();

  const verifyResponse = await request(app).post(`/api/auth/invite/${token}/verify-email`).send({
    verificationToken: 'b'.repeat(32),
  });

  assert.equal(verifyResponse.status, 200);

  const response = await request(app).post('/api/auth/invite/accept').send({
    token,
    password: 'VeryStrongPassword123!',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(inviteStore.has(`invite.token.${token}`), false);
  assert.equal(updatePayloads.length, 1);
  assert.equal(updatePayloads[0].where.id, 'invited-user-1');
  assert.equal(await bcrypt.compare('VeryStrongPassword123!', updatePayloads[0].data.passwordHash), true);
  assert.equal(auditActions.includes('USER_INVITE_ACCEPTED'), true);
  assert.equal(auditActions.includes('USER_INVITE_EMAIL_VERIFIED'), true);
});

test('integration: invite acceptance requires verified email first', async () => {
  const { token, updatePayloads } = installInviteMocks();
  const app = createTestApp();

  const response = await request(app).post('/api/auth/invite/accept').send({
    token,
    password: 'VeryStrongPassword123!',
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'Invitation email must be verified before account activation');
  assert.equal(updatePayloads.length, 0);
});

test('integration: invite acceptance rejects expired token and deletes it', async () => {
  const { token, inviteStore, updatePayloads } = installInviteMocks({
    invitePayload: {
      userId: 'invited-user-1',
      email: 'invitee@example.com',
      expiresAt: new Date(Date.now() - 1000 * 60).toISOString(),
    },
  });

  const app = createTestApp();

  const response = await request(app).post('/api/auth/invite/accept').send({
    token,
    password: 'VeryStrongPassword123!',
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Invite token is invalid or expired');
  assert.equal(inviteStore.has(`invite.token.${token}`), false);
  assert.equal(updatePayloads.length, 0);
});
