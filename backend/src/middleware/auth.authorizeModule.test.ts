import test from 'node:test';
import assert from 'node:assert/strict';
import { NextFunction, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authorizeModule } from './auth';

type MockResult = {
  statusCode: number | null;
  payload: Record<string, unknown> | null;
  nextCalled: boolean;
};

const prismaSystemSetting = prisma.systemSetting as unknown as {
  findUnique: (args: { where: { key: string }; select: { value: true } }) => Promise<{ value: string } | null>;
};

const originalFindUnique = prismaSystemSetting.findUnique.bind(prismaSystemSetting);

const runAuthorizeModule = async (
  role: string,
  moduleName:
    | 'dashboard'
    | 'membership'
    | 'members-list'
    | 'loan'
    | 'loans-list'
    | 'document-review'
    | 'audit-log'
    | 'cms'
    | 'user-management'
    | 'settings'
): Promise<MockResult> => {
  const req = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      role,
      branchId: null,
      name: 'Test User',
    },
  } as AuthRequest;

  let statusCode: number | null = null;
  let payload: Record<string, unknown> | null = null;
  let nextCalled = false;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: Record<string, unknown>) => {
      payload = body;
      return res;
    },
  } as unknown as Response;

  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  await authorizeModule(moduleName)(req, res, next);
  return { statusCode, payload, nextCalled };
};

test.beforeEach(() => {
  prismaSystemSetting.findUnique = async () => null;
});

test.after(async () => {
  prismaSystemSetting.findUnique = originalFindUnique;
});

test('SUPER_ADMIN can access user-management module', async () => {
  const result = await runAuthorizeModule('SUPER_ADMIN', 'user-management');
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});

test('BRANCH_MANAGER cannot access user-management module', async () => {
  const result = await runAuthorizeModule('BRANCH_MANAGER', 'user-management');
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
});

test('MEMBERSHIP_OFFICER can access membership module', async () => {
  const result = await runAuthorizeModule('MEMBERSHIP_OFFICER', 'membership');
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});

test('LOAN_OFFICER can access loan module', async () => {
  const result = await runAuthorizeModule('LOAN_OFFICER', 'loan');
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});

test('KYC_OFFICER can access document-review module', async () => {
  const result = await runAuthorizeModule('KYC_OFFICER', 'document-review');
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});

test('CONTENT_ADMIN can access cms module', async () => {
  const result = await runAuthorizeModule('CONTENT_ADMIN', 'cms');
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});

test('CONTENT_ADMIN cannot access dashboard module by default', async () => {
  const result = await runAuthorizeModule('CONTENT_ADMIN', 'dashboard');
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.payload?.error, {
    code: 'PERMISSION_DENIED',
    message: 'Role CONTENT_ADMIN does not have access to module dashboard',
    details: null,
  });
});

test('role module override grants configured module access', async () => {
  prismaSystemSetting.findUnique = async ({ where }) => {
    if (where.key === 'rbac.modules.CONTENT_ADMIN') {
      return { value: JSON.stringify(['dashboard', 'cms',]) };
    }
    return null;
  };

  const result = await runAuthorizeModule('CONTENT_ADMIN', 'dashboard');
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});
