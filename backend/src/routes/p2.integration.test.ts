import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import settingsRoutes from './settings.routes';

import auditRoutes from './audit.routes';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

type MockAdminUser = {
  id: string;
  email: string;
  role: string;
  branchId: string | null;
  name: string;
  isActive: boolean;
};

const superAdmin: MockAdminUser = {
  id: 'super-admin-id',
  email: 'super@example.com',
  role: 'SUPER_ADMIN',
  branchId: null,
  name: 'Super Admin',
  isActive: true,
};

const superToken = jwt.sign(
  {
    id: superAdmin.id,
    email: superAdmin.email,
    role: superAdmin.role,
  },
  process.env.JWT_SECRET as string,
  { expiresIn: '1h' }
);

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/settings', settingsRoutes);

  app.use('/api/admin/audit-logs', auditRoutes);
  return app;
};

const original = {
  adminUserFindUnique: prisma.adminUser.findUnique,
  adminUserFindMany: prisma.adminUser.findMany,
  adminUserCount: prisma.adminUser.count,
  systemSettingFindUnique: prisma.systemSetting.findUnique,
  systemSettingFindMany: prisma.systemSetting.findMany,
  systemSettingUpsert: prisma.systemSetting.upsert,
  membershipCount: prisma.membershipApplication.count,
  loanCount: prisma.loanApplication.count,
  workflowCount: prisma.workflowHistory.count,
  auditCount: prisma.auditLog.count,
  auditFindMany: prisma.auditLog.findMany,
  auditGroupBy: prisma.auditLog.groupBy,
  exportAuditRecordCreate: prisma.exportAuditRecord.create,
  queryRawUnsafe: prisma.$queryRawUnsafe,
  executeRawUnsafe: prisma.$executeRawUnsafe,
};

const restorePrisma = () => {
  prisma.adminUser.findUnique = original.adminUserFindUnique;
  prisma.adminUser.findMany = original.adminUserFindMany;
  prisma.adminUser.count = original.adminUserCount;
  prisma.systemSetting.findUnique = original.systemSettingFindUnique;
  prisma.systemSetting.findMany = original.systemSettingFindMany;
  prisma.systemSetting.upsert = original.systemSettingUpsert;
  prisma.membershipApplication.count = original.membershipCount;
  prisma.loanApplication.count = original.loanCount;
  prisma.workflowHistory.count = original.workflowCount;
  prisma.auditLog.count = original.auditCount;
  prisma.auditLog.findMany = original.auditFindMany;
  prisma.auditLog.groupBy = original.auditGroupBy;
  prisma.exportAuditRecord.create = original.exportAuditRecordCreate;
  prisma.$queryRawUnsafe = original.queryRawUnsafe;
  prisma.$executeRawUnsafe = original.executeRawUnsafe;
};

const installBaseMocks = () => {
  const featureStore = new Map<string, string>([
    ['feature.enableBackgroundExportQueue', 'true'],
    ['feature.enableSloDashboard', 'true'],
    ['feature.enableAuditPolicyDashboard', 'true'],
    ['feature.enableStrictSensitiveDataPolicy', 'true'],
  ]);

  prisma.adminUser.findUnique = (async ({ where }: { where: { id?: string; email?: string } }) => {
    if (where.id === superAdmin.id || where.email === superAdmin.email) {
      return superAdmin;
    }
    return null;
  }) as unknown as typeof prisma.adminUser.findUnique;

  prisma.systemSetting.findUnique = (async () => null) as unknown as typeof prisma.systemSetting.findUnique;

  prisma.systemSetting.findMany = (async ({ where }: { where?: { key?: { startsWith?: string } } }) => {
    const startsWith = where?.key?.startsWith;
    if (startsWith === 'feature.') {
      return Array.from(featureStore.entries()).map(([key, value]) => ({ key, value }));
    }
    return [];
  }) as unknown as typeof prisma.systemSetting.findMany;

  prisma.systemSetting.upsert = (async ({ where, create, update }: { where: { key: string }; create: { value: string }; update: { value: string } }) => {
    const value = update?.value ?? create.value;
    featureStore.set(where.key, value);
    return { key: where.key, value };
  }) as unknown as typeof prisma.systemSetting.upsert;

  prisma.adminUser.findMany = (async () => []) as unknown as typeof prisma.adminUser.findMany;
  prisma.adminUser.count = (async () => 1) as unknown as typeof prisma.adminUser.count;

  prisma.membershipApplication.count = (async () => 2) as unknown as typeof prisma.membershipApplication.count;
  prisma.loanApplication.count = (async () => 1) as unknown as typeof prisma.loanApplication.count;
  prisma.workflowHistory.count = (async () => 10) as unknown as typeof prisma.workflowHistory.count;

  prisma.auditLog.count = (async () => 5) as unknown as typeof prisma.auditLog.count;
  prisma.auditLog.findMany = (async () => [
    {
      id: 'audit-1',
      createdAt: new Date('2026-03-27T10:00:00.000Z'),
      userId: superAdmin.id,
      action: 'SETTINGS_UPDATED',
      targetType: 'SYSTEM_SETTING',
      targetId: 'x',
      ipAddress: '127.0.0.1',
      details: 'test event',
      user: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        branch: null,
      },
    },
  ]) as unknown as typeof prisma.auditLog.findMany;

  prisma.auditLog.groupBy = (async () => [
    {
      ipAddress: '127.0.0.1',
      _count: {
        ipAddress: 22,
      },
    },
  ]) as unknown as typeof prisma.auditLog.groupBy;

  prisma.exportAuditRecord.create = (async () => ({
    id: 'export-audit-record-1',
  })) as unknown as typeof prisma.exportAuditRecord.create;

  prisma.$queryRawUnsafe = (async () => []) as unknown as typeof prisma.$queryRawUnsafe;

  prisma.$executeRawUnsafe = (async () => 1) as unknown as typeof prisma.$executeRawUnsafe;

  return { featureStore };
};

test.afterEach(() => {
  restorePrisma();
});

test('smoke: feature flags get/patch and environment drift endpoints respond successfully', async () => {
  const { featureStore } = installBaseMocks();
  const app = createTestApp();

  const getFlags = await request(app)
    .get('/api/admin/settings/feature-flags')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(getFlags.status, 200);
  assert.equal(getFlags.body.flags.enableBackgroundExportQueue, true);

  const patchFlags = await request(app)
    .patch('/api/admin/settings/feature-flags')
    .set('Authorization', `Bearer ${superToken}`)
    .send({ enableBackgroundExportQueue: false });

  assert.equal(patchFlags.status, 200);
  assert.equal(featureStore.get('feature.enableBackgroundExportQueue'), 'false');

  const drift = await request(app)
    .get('/api/admin/settings/environment-drift')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(drift.status, 200);
  assert.ok(typeof drift.body.status === 'string');
  assert.ok(Array.isArray(drift.body.checks.requiredVars));
});

test('smoke: SLO dashboard and audit dashboard endpoints respond successfully', async () => {
  installBaseMocks();
  const app = createTestApp();

  const dashboard = await request(app)
    .get('/api/admin/audit-logs/dashboard')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(dashboard.status, 200);
  assert.ok(typeof dashboard.body.summary.total24h === 'number');
  assert.ok(Array.isArray(dashboard.body.suspiciousIps));

  assert.ok(typeof dashboard.body.summary.permissionFailures === 'number');
});

test('smoke: audit export queue endpoint enqueues job when feature flag is enabled', async () => {
  installBaseMocks();
  const app = createTestApp();

  let insertCallCount = 0;
  prisma.$executeRawUnsafe = (async (sql: string) => {
    if (sql.includes('INSERT INTO background_job_queue')) {
      insertCallCount += 1;
    }
    return 1;
  }) as unknown as typeof prisma.$executeRawUnsafe;

  const response = await request(app)
    .post('/api/admin/audit-logs/export-jobs')
    .set('Authorization', `Bearer ${superToken}`)
    .send({ format: 'json', limit: 10 });

  assert.equal(response.status, 202);
  assert.equal(response.body.queued, true);
  assert.ok(typeof response.body.jobId === 'string');
  assert.equal(insertCallCount, 1);
});

test('integration: cursor pagination on settings users returns cursor metadata', async () => {
  installBaseMocks();
  const app = createTestApp();

  prisma.adminUser.findMany = (async () => [
    {
      id: 'user-2',
      name: 'User Two',
      email: 'user2@example.com',
      role: 'CONTENT_ADMIN',
      branchId: null,
      branch: null,
      isActive: true,
      lastLogin: null,
      createdAt: new Date('2026-03-27T10:00:00.000Z'),
      updatedAt: new Date('2026-03-27T10:00:00.000Z'),
    },
  ]) as unknown as typeof prisma.adminUser.findMany;

  prisma.$queryRawUnsafe = (async () => []) as unknown as typeof prisma.$queryRawUnsafe;

  const response = await request(app)
    .get('/api/admin/settings/users?cursor=user-1&limit=1')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.pagination.mode, 'cursor');
  assert.equal(response.body.pagination.total, null);
  assert.equal(response.body.pagination.nextCursor, 'user-2');
  assert.equal(response.body.users.length, 1);
});

test('integration: cursor pagination on audit logs returns cursor metadata', async () => {
  installBaseMocks();
  const app = createTestApp();

  prisma.auditLog.findMany = (async () => [
    {
      id: 'audit-2',
      createdAt: new Date('2026-03-27T11:00:00.000Z'),
      userId: superAdmin.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'ADMIN_USER',
      targetId: superAdmin.id,
      ipAddress: '192.168.1.10',
      details: 'ok',
      user: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        branch: null,
      },
    },
  ]) as unknown as typeof prisma.auditLog.findMany;

  const response = await request(app)
    .get('/api/admin/audit-logs?cursor=audit-1&limit=1')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.pagination.mode, 'cursor');
  assert.equal(response.body.pagination.total, null);
  assert.equal(response.body.pagination.nextCursor, 'audit-2');
  assert.equal(response.body.events.length, 1);
});

test('integration: signed audit export returns signature headers and persists export trail', async () => {
  installBaseMocks();
  const app = createTestApp();

  let exportInsertCount = 0;
  prisma.exportAuditRecord.create = (async () => {
    exportInsertCount += 1;
    return { id: 'export-audit-record-2' };
  }) as unknown as typeof prisma.exportAuditRecord.create;

  prisma.auditLog.findMany = (async () => [
    {
      id: 'audit-export-1',
      createdAt: new Date('2026-03-27T12:00:00.000Z'),
      userId: superAdmin.id,
      action: 'SETTINGS_UPDATED',
      targetType: 'SYSTEM_SETTING',
      targetId: 'setting-1',
      ipAddress: '127.0.0.1',
      details: 'Changed threshold',
      user: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    },
  ]) as unknown as typeof prisma.auditLog.findMany;

  const response = await request(app)
    .get('/api/admin/audit-logs/export?format=json&limit=5')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(response.status, 200);
  assert.ok(typeof response.headers['x-audit-export-digest'] === 'string');
  assert.ok(typeof response.headers['x-audit-export-signature'] === 'string');
  assert.equal(response.body.total, 1);
  assert.equal(Array.isArray(response.body.events), true);
  assert.equal(exportInsertCount, 1);
});
