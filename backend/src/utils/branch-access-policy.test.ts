import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBranchAccessPolicy } from './branch-access-policy';

test('SUPER_ADMIN can access any branch-bound record', () => {
  const result = evaluateBranchAccessPolicy({
    role: 'SUPER_ADMIN',
    userBranchId: null,
    targetBranchId: 'branch-a',
  });

  assert.deepEqual(result, { allowed: true });
});

test('branch-scoped user must have a branch assignment', () => {
  const result = evaluateBranchAccessPolicy({
    role: 'BRANCH_MANAGER',
    userBranchId: null,
    targetBranchId: 'branch-a',
  });

  assert.deepEqual(result, { allowed: false, reason: 'MISSING_USER_BRANCH' });
});

test('branch-scoped user can access same-branch records', () => {
  const result = evaluateBranchAccessPolicy({
    role: 'LOAN_OFFICER',
    userBranchId: 'branch-a',
    targetBranchId: 'branch-a',
  });

  assert.deepEqual(result, { allowed: true });
});

test('branch-scoped user is blocked from cross-branch records', () => {
  const result = evaluateBranchAccessPolicy({
    role: 'MEMBERSHIP_OFFICER',
    userBranchId: 'branch-a',
    targetBranchId: 'branch-b',
  });

  assert.deepEqual(result, { allowed: false, reason: 'CROSS_BRANCH_FORBIDDEN' });
});

test('KYC_OFFICER branch policy allows unbound branch operations when user is assigned', () => {
  const result = evaluateBranchAccessPolicy({
    role: 'KYC_OFFICER',
    userBranchId: 'branch-a',
    targetBranchId: null,
  });

  assert.deepEqual(result, { allowed: true });
});

test('CONTENT_ADMIN branch policy still requires branch assignment for branch-bound data', () => {
  const result = evaluateBranchAccessPolicy({
    role: 'CONTENT_ADMIN',
    userBranchId: null,
    targetBranchId: 'branch-a',
  });

  assert.deepEqual(result, { allowed: false, reason: 'MISSING_USER_BRANCH' });
});
