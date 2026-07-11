import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import settingsRoutes from './settings.routes';

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
  id: 'super',
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
  return app;
};

const original = {
  adminUserFindUnique: prisma.adminUser.findUnique,
  adminUserFindMany: prisma.adminUser.findMany,
  adminUserUpdateMany: prisma.adminUser.updateMany,
  adminUserCount: prisma.adminUser.count,
  branchFindUnique: prisma.branch.findUnique,
  auditLogCreate: prisma.auditLog.create,
  systemSettingFindUnique: prisma.systemSetting.findUnique,
  queryRawUnsafe: prisma.$queryRawUnsafe,
  executeRawUnsafe: prisma.$executeRawUnsafe,
};

const restorePrisma = () => {
  prisma.adminUser.findUnique = original.adminUserFindUnique;
  prisma.adminUser.findMany = original.adminUserFindMany;
  prisma.adminUser.updateMany = original.adminUserUpdateMany;
  prisma.adminUser.count = original.adminUserCount;
  prisma.branch.findUnique = original.branchFindUnique;
  prisma.auditLog.create = original.auditLogCreate;
  prisma.systemSetting.findUnique = original.systemSettingFindUnique;
  prisma.$queryRawUnsafe = original.queryRawUnsafe;
  prisma.$executeRawUnsafe = original.executeRawUnsafe;
};

const installSettingsStoreMocks = () => {
  const settingStore = new Map<string, string>();

  prisma.adminUser.findUnique = (async () => superAdmin) as unknown as typeof prisma.adminUser.findUnique;
  prisma.adminUser.findMany = (async () => []) as unknown as typeof prisma.adminUser.findMany;
  prisma.adminUser.updateMany = (async () => ({ count: 0 })) as unknown as typeof prisma.adminUser.updateMany;
  prisma.adminUser.count = (async () => 1) as unknown as typeof prisma.adminUser.count;
  prisma.branch.findUnique = (async () => ({ id: 'branch-1' })) as unknown as typeof prisma.branch.findUnique;
  prisma.auditLog.create = (async () => ({ id: 'audit-1' })) as unknown as typeof prisma.auditLog.create;
  prisma.systemSetting.findUnique = (async () => null) as unknown as typeof prisma.systemSetting.findUnique;

  prisma.$executeRawUnsafe = (async (_sql: string, key: string, value: string) => {
    settingStore.set(key, value);
    return 1;
  }) as unknown as typeof prisma.$executeRawUnsafe;

  prisma.$queryRawUnsafe = (async (sql: string, ...args: unknown[]) => {
    if (sql.includes('WHERE key = ANY($1)')) {
      const keys = (args[0] as string[]) || [];
      return keys
        .filter((key) => settingStore.has(key))
        .map((key) => ({ key, value: settingStore.get(key) as string }));
    }

    if (sql.includes('WHERE key LIKE $1')) {
      const likePattern = String(args[0] || '');
      const prefix = likePattern.replace('%', '');
      return Array.from(settingStore.entries())
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({ key, value }));
    }

    return [];
  }) as unknown as typeof prisma.$queryRawUnsafe;

  return settingStore;
};

test.afterEach(() => {
  restorePrisma();
});

test('integration: role-permission override is persisted and returned by access-control', async () => {
  const settingStore = installSettingsStoreMocks();
  const app = createTestApp();

  const patchResponse = await request(app)
    .patch('/api/admin/settings/access-control/BRANCH_MANAGER')
    .set('Authorization', `Bearer ${superToken}`)
    .send({ modules: ['dashboard', 'audit-log'] });

  assert.equal(patchResponse.status, 200);
  assert.equal(settingStore.get('rbac.modules.BRANCH_MANAGER'), JSON.stringify(['dashboard', 'audit-log']));

  const getResponse = await request(app)
    .get('/api/admin/settings/access-control')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(getResponse.status, 200);

  const branchManager = (getResponse.body.roles as Array<{ role: string; modules: string[] }>).find(
    (item) => item.role === 'BRANCH_MANAGER'
  );

  assert.ok(branchManager);
  assert.deepEqual(branchManager?.modules, ['dashboard', 'audit-log']);
});

test('integration: system settings update persists and is returned on read', async () => {
  installSettingsStoreMocks();
  const app = createTestApp();

  const patchResponse = await request(app)
    .patch('/api/admin/settings/system')
    .set('Authorization', `Bearer ${superToken}`)
    .send({
      loanApprovalThreshold: 7500000,
      automatedAssignment: 'MANUAL',
      complianceLock: false,
      dualControlEnabled: true,
    });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body.settings.loanApprovalThreshold, 7500000);
  assert.equal(patchResponse.body.settings.automatedAssignment, 'MANUAL');
  assert.equal(patchResponse.body.settings.complianceLock, false);
  assert.equal(patchResponse.body.settings.dualControlEnabled, true);

  const getResponse = await request(app)
    .get('/api/admin/settings/system')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.settings.loanApprovalThreshold, 7500000);
  assert.equal(getResponse.body.settings.automatedAssignment, 'MANUAL');
  assert.equal(getResponse.body.settings.complianceLock, false);
  assert.equal(getResponse.body.settings.dualControlEnabled, true);
});

test('integration: role impact preview returns branch-required blocker and module deltas', async () => {
  installSettingsStoreMocks();
  const app = createTestApp();

  prisma.adminUser.findUnique = (async ({ where }: { where: { id?: string } }) => {
    if (where.id === superAdmin.id) {
      return superAdmin;
    }

    return {
      id: 'target-user-1',
      role: 'CONTENT_ADMIN',
      branchId: null,
      isActive: true,
    };
  }) as unknown as typeof prisma.adminUser.findUnique;

  const response = await request(app)
    .post('/api/admin/settings/users/target-user-1/role-impact-preview')
    .set('Authorization', `Bearer ${superToken}`)
    .send({ role: 'BRANCH_MANAGER', branchId: null, isActive: true });

  assert.equal(response.status, 200);
  assert.equal(response.body.current.role, 'CONTENT_ADMIN');
  assert.equal(response.body.proposed.role, 'BRANCH_MANAGER');
  assert.equal(response.body.canSave, false);
  assert.equal(
    (response.body.impacts as Array<{ code: string }>).some((impact) => impact.code === 'BRANCH_REQUIRED'),
    true
  );
});

test('integration: bulk user activate action updates targeted users', async () => {
  installSettingsStoreMocks();
  const app = createTestApp();

  let updatedCount = 0;
  prisma.adminUser.findMany = (async () => [
    { id: '10000000-0000-4000-8000-000000000001', email: 'one@example.com', role: 'BRANCH_MANAGER', isActive: false },
    { id: '10000000-0000-4000-8000-000000000002', email: 'two@example.com', role: 'CONTENT_ADMIN', isActive: false },
  ]) as unknown as typeof prisma.adminUser.findMany;

  prisma.adminUser.updateMany = (async () => {
    updatedCount = 2;
    return { count: 2 };
  }) as unknown as typeof prisma.adminUser.updateMany;

  const response = await request(app)
    .post('/api/admin/settings/users/bulk')
    .set('Authorization', `Bearer ${superToken}`)
    .send({
      action: 'ACTIVATE',
      userIds: ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'],
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.action, 'ACTIVATE');
  assert.equal(response.body.affectedCount, 2);
  assert.equal(updatedCount, 2);
});
