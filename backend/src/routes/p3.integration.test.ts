import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import adminRoutes from './admin.routes';


process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const superAdmin = {
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
  app.use('/api/admin', adminRoutes);

  return app;
};

const original = {
  adminUserFindUnique: prisma.adminUser.findUnique,
  systemSettingFindUnique: prisma.systemSetting.findUnique,
  membershipFindMany: prisma.membershipApplication.findMany,
  loanFindMany: prisma.loanApplication.findMany,
  branchFindMany: prisma.branch.findMany,
  auditCount: prisma.auditLog.count,
  notificationCount: prisma.notificationEvent.count,
};

const restorePrisma = () => {
  prisma.adminUser.findUnique = original.adminUserFindUnique;
  prisma.systemSetting.findUnique = original.systemSettingFindUnique;
  prisma.membershipApplication.findMany = original.membershipFindMany;
  prisma.loanApplication.findMany = original.loanFindMany;
  prisma.branch.findMany = original.branchFindMany;
  prisma.auditLog.count = original.auditCount;
  prisma.notificationEvent.count = original.notificationCount;
};

test.afterEach(() => {
  restorePrisma();
});

test('integration: stale escalation dashboard returns escalation payload', async () => {
  prisma.adminUser.findUnique = (async ({ where }: { where: { id: string } }) => {
    if (where.id === superAdmin.id) {
      return superAdmin;
    }
    return null;
  }) as unknown as typeof prisma.adminUser.findUnique;

  prisma.systemSetting.findUnique = (async () => null) as unknown as typeof prisma.systemSetting.findUnique;

  prisma.membershipApplication.findMany = (async () => [
    {
      id: 'm-1',
      status: 'APPROVED',
      createdAt: new Date('2026-03-20T08:00:00.000Z'),
      submittedAt: new Date('2026-03-20T09:00:00.000Z'),
      reviewedAt: new Date('2026-03-22T09:00:00.000Z'),
      updatedAt: new Date('2026-03-22T09:00:00.000Z'),
      branchId: 'b-1',
    },
    {
      id: 'm-2',
      status: 'UNDER_REVIEW',
      createdAt: new Date('2026-03-24T08:00:00.000Z'),
      submittedAt: new Date('2026-03-24T09:00:00.000Z'),
      reviewedAt: null,
      updatedAt: new Date('2026-03-25T09:00:00.000Z'),
      branchId: 'b-2',
    },
  ]) as unknown as typeof prisma.membershipApplication.findMany;

  prisma.loanApplication.findMany = (async () => [
    {
      id: 'l-1',
      status: 'REJECTED',
      createdAt: new Date('2026-03-21T08:00:00.000Z'),
      submittedAt: new Date('2026-03-21T09:00:00.000Z'),
      reviewedAt: new Date('2026-03-23T09:00:00.000Z'),
      updatedAt: new Date('2026-03-23T09:00:00.000Z'),
      branchId: 'b-1',
    },
  ]) as unknown as typeof prisma.loanApplication.findMany;

  prisma.branch.findMany = (async () => [
    { id: 'b-1', name: 'Mekelle' },
    { id: 'b-2', name: 'Addis Abeba' },
  ]) as unknown as typeof prisma.branch.findMany;

  const app = createTestApp();

  const response = await request(app)
    .get('/api/admin/workflow/stale-escalations')
    .set('Authorization', `Bearer ${superToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.escalationRules));
  assert.ok(typeof response.body.total === 'number');
  assert.ok(Array.isArray(response.body.escalations));
});
