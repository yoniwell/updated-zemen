import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import adminRoutes from './admin.routes';
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

const usersById: Record<string, MockAdminUser> = {
  super: {
    id: 'super',
    email: 'super@example.com',
    role: 'SUPER_ADMIN',
    branchId: null,
    name: 'Super Admin',
    isActive: true,
  },
  branchNoScope: {
    id: 'branchNoScope',
    email: 'branch-noscope@example.com',
    role: 'BRANCH_MANAGER',
    branchId: null,
    name: 'Branch Manager No Scope',
    isActive: true,
  },
  branchScoped: {
    id: 'branchScoped',
    email: 'branch-scoped@example.com',
    role: 'BRANCH_MANAGER',
    branchId: 'branch-1',
    name: 'Branch Manager Scoped',
    isActive: true,
  },
};

const tokenFor = (userId: keyof typeof usersById): string =>
  jwt.sign(
    {
      id: usersById[userId].id,
      email: usersById[userId].email,
      role: usersById[userId].role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/audit-logs', auditRoutes);
  return app;
};

const original = {
  adminUserFindUnique: prisma.adminUser.findUnique,
  systemSettingFindUnique: prisma.systemSetting.findUnique,
  membershipFindUnique: prisma.membershipApplication.findUnique,
  membershipUpdate: prisma.membershipApplication.update,
  membershipUpdateMany: prisma.membershipApplication.updateMany,
  workflowCreate: prisma.workflowHistory.create,
  applicationNoteCreate: prisma.applicationNote.create,
  documentFindUnique: prisma.document.findUnique,
  documentUpdate: prisma.document.update,
  auditLogCreate: prisma.auditLog.create,
  membershipFindMany: prisma.membershipApplication.findMany,
  membershipCount: prisma.membershipApplication.count,
};

const restorePrisma = () => {
  prisma.adminUser.findUnique = original.adminUserFindUnique;
  prisma.systemSetting.findUnique = original.systemSettingFindUnique;
  prisma.membershipApplication.findUnique = original.membershipFindUnique;
  prisma.membershipApplication.update = original.membershipUpdate;
  prisma.membershipApplication.updateMany = original.membershipUpdateMany;
  prisma.workflowHistory.create = original.workflowCreate;
  prisma.applicationNote.create = original.applicationNoteCreate;
  prisma.document.findUnique = original.documentFindUnique;
  prisma.document.update = original.documentUpdate;
  prisma.auditLog.create = original.auditLogCreate;
  prisma.membershipApplication.findMany = original.membershipFindMany;
  prisma.membershipApplication.count = original.membershipCount;
};

const installBaseAuthMocks = () => {
  prisma.adminUser.findUnique = (async ({ where }: { where: { id: string } }) => {
    return usersById[where.id as keyof typeof usersById] || null;
  }) as unknown as typeof prisma.adminUser.findUnique;

  prisma.systemSetting.findUnique = (async () => null) as unknown as typeof prisma.systemSetting.findUnique;

  prisma.auditLog.create = (async () => ({ id: 'audit-log-1' })) as unknown as typeof prisma.auditLog.create;
};

test.afterEach(() => {
  restorePrisma();
});

test('integration: auth required for protected admin route', async () => {
  installBaseAuthMocks();
  const app = createTestApp();

  const response = await request(app).get('/api/admin/queues/membership');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('integration: RBAC module restriction blocks audit-log access', async () => {
  installBaseAuthMocks();
  prisma.systemSetting.findUnique = (async ({ where }: { where: { key: string } }) => {
    if (where.key === 'rbac.modules.BRANCH_MANAGER') {
      return { value: JSON.stringify(['dashboard']) };
    }
    return null;
  }) as unknown as typeof prisma.systemSetting.findUnique;

  const app = createTestApp();

  const response = await request(app)
    .get('/api/admin/audit-logs')
    .set('Authorization', `Bearer ${tokenFor('branchScoped')}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'PERMISSION_DENIED');
});

test('integration: branch-scoped role requires branch assignment', async () => {
  installBaseAuthMocks();
  const app = createTestApp();

  const response = await request(app)
    .get('/api/admin/queues/membership')
    .set('Authorization', `Bearer ${tokenFor('branchNoScope')}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'Branch-scoped access requires a user branch assignment');
});

test('integration: membership queue includes SLA aging metrics', async () => {
  installBaseAuthMocks();
  const app = createTestApp();

  prisma.membershipApplication.findMany = (async () => [
    {
      id: 'mq-1',
      referenceNo: 'MEM-QUEUE-1',
      status: 'UNDER_REVIEW',
      applicantType: 'INDIVIDUAL',
      submittedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 35 * 60 * 60 * 1000),
      updatedAt: new Date(),
      applicant: {
        firstName: 'Test',
        lastName: 'User',
        phone: '0911000111',
      },
      branch: null,
      assignedTo: null,
      documents: [],
    },
  ]) as unknown as typeof prisma.membershipApplication.findMany;

  prisma.membershipApplication.count = (async () => 1) as unknown as typeof prisma.membershipApplication.count;

  const response = await request(app)
    .get('/api/admin/queues/membership?page=1&limit=10')
    .set('Authorization', `Bearer ${tokenFor('super')}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.applications.length, 1);
  assert.equal(typeof response.body.applications[0].queueMetrics.ageHours, 'number');
  assert.equal(typeof response.body.applications[0].queueMetrics.slaBreached, 'boolean');
    assert.equal(typeof response.body.applications[0].queueMetrics.escalation.escalated, 'boolean');
});

test('integration: valid status transition updates application and records workflow', async () => {
  installBaseAuthMocks();
  const app = createTestApp();

  let membershipFindCalls = 0;
  let workflowCreateCalls = 0;

  const existing = {
    id: 'app-1',
    status: 'SUBMITTED',
    branchId: 'branch-1',
    assignedToId: null,
    updatedAt: new Date('2026-03-27T10:00:00.000Z'),
  };

  const updated = {
    ...existing,
    status: 'UNDER_REVIEW',
    updatedAt: new Date('2026-03-27T10:05:00.000Z'),
  };

  prisma.membershipApplication.findUnique = (async () => {
    membershipFindCalls += 1;
    return membershipFindCalls === 1 ? existing : updated;
  }) as unknown as typeof prisma.membershipApplication.findUnique;

  prisma.membershipApplication.updateMany = (async () => ({ count: 1 })) as unknown as typeof prisma.membershipApplication.updateMany;

  prisma.workflowHistory.create = (async () => {
    workflowCreateCalls += 1;
    return {
      id: 'workflow-1',
      fromStatus: 'SUBMITTED',
      toStatus: 'UNDER_REVIEW',
    };
  }) as unknown as typeof prisma.workflowHistory.create;

  const response = await request(app)
    .patch('/api/admin/applications/membership/app-1/status')
    .set('Authorization', `Bearer ${tokenFor('super')}`)
    .send({
      status: 'UNDER_REVIEW',
      expectedUpdatedAt: existing.updatedAt.toISOString(),
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.application.status, 'UNDER_REVIEW');
  assert.equal(workflowCreateCalls, 1);
});

test('integration: repeated status update with same idempotency key returns cached response', async () => {
  installBaseAuthMocks();
  const app = createTestApp();

  let membershipFindCalls = 0;
  let workflowCreateCalls = 0;

  const existing = {
    id: 'app-2',
    status: 'SUBMITTED',
    branchId: 'branch-1',
    assignedToId: null,
    updatedAt: new Date('2026-03-27T11:00:00.000Z'),
  };

  const updated = {
    ...existing,
    status: 'UNDER_REVIEW',
    updatedAt: new Date('2026-03-27T11:05:00.000Z'),
  };

  prisma.membershipApplication.findUnique = (async () => {
    membershipFindCalls += 1;
    return membershipFindCalls === 1 ? existing : updated;
  }) as unknown as typeof prisma.membershipApplication.findUnique;

  prisma.membershipApplication.updateMany = (async () => ({ count: 1 })) as unknown as typeof prisma.membershipApplication.updateMany;

  prisma.workflowHistory.create = (async () => {
    workflowCreateCalls += 1;
    return {
      id: 'workflow-2',
      fromStatus: 'SUBMITTED',
      toStatus: 'UNDER_REVIEW',
    };
  }) as unknown as typeof prisma.workflowHistory.create;

  const first = await request(app)
    .patch('/api/admin/applications/membership/app-2/status')
    .set('Authorization', `Bearer ${tokenFor('super')}`)
    .set('Idempotency-Key', 'idem-status-1')
    .send({
      status: 'UNDER_REVIEW',
      expectedUpdatedAt: existing.updatedAt.toISOString(),
    });

  const second = await request(app)
    .patch('/api/admin/applications/membership/app-2/status')
    .set('Authorization', `Bearer ${tokenFor('super')}`)
    .set('Idempotency-Key', 'idem-status-1')
    .send({
      status: 'UNDER_REVIEW',
      expectedUpdatedAt: existing.updatedAt.toISOString(),
    });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.application.status, 'UNDER_REVIEW');
  assert.equal(second.body.application.status, 'UNDER_REVIEW');
  assert.equal(workflowCreateCalls, 1);
});

test('integration: request-info accepts reason template and records templated note', async () => {
  installBaseAuthMocks();
  const app = createTestApp();

  let workflowNote: string | null = null;
  let applicationNoteContent: string | null = null;

  const existing = {
    id: 'app-3',
    status: 'UNDER_REVIEW',
    branchId: 'branch-1',
    assignedToId: null,
    updatedAt: new Date('2026-03-27T12:00:00.000Z'),
  };

  prisma.membershipApplication.findUnique = (async () => existing) as unknown as typeof prisma.membershipApplication.findUnique;
  prisma.membershipApplication.update = (async () => ({ ...existing, status: 'PENDING_DOCUMENTS' })) as unknown as typeof prisma.membershipApplication.update;

  prisma.workflowHistory.create = (async ({ data }: { data: { note: string } }) => {
    workflowNote = data.note;
    return { id: 'workflow-3' };
  }) as unknown as typeof prisma.workflowHistory.create;

  prisma.applicationNote.create = (async ({ data }: { data: { content: string } }) => {
    applicationNoteContent = data.content;
    return { id: 'note-3' };
  }) as unknown as typeof prisma.applicationNote.create;

  const response = await request(app)
    .post('/api/admin/applications/membership/app-3/request-info')
    .set('Authorization', `Bearer ${tokenFor('super')}`)
    .send({ templateId: 'MISSING_CORE_KYC' });

  assert.equal(response.status, 200);
  assert.equal(response.body.application.status, 'PENDING_DOCUMENTS');
  assert.match(workflowNote || '', /missing core KYC documents/i);
  assert.match(applicationNoteContent || '', /missing core KYC documents/i);
});

test('integration: document verify endpoint updates review status', async () => {
  installBaseAuthMocks();
  const app = createTestApp();

  prisma.document.findUnique = (async () => ({
    id: 'doc-1',
    status: 'PENDING',
  })) as unknown as typeof prisma.document.findUnique;

  prisma.document.update = (async () => ({
    id: 'doc-1',
    status: 'VERIFIED',
  })) as unknown as typeof prisma.document.update;

  const response = await request(app)
    .patch('/api/admin/documents/doc-1/verify')
    .set('Authorization', `Bearer ${tokenFor('super')}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.document.status, 'VERIFIED');
});
