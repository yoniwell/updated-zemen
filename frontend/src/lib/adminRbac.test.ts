import { afterEach, describe, expect, it } from 'vitest';
import {
  canAccessModule,
  getRoleForSession,
  roleRequiresBranch,
  setRoleAccessOverrides,
  type AdminRole,
} from './adminRbac';
import type { AdminUserSession } from './adminAuth';

const makeUser = (role: AdminRole): AdminUserSession => ({
  id: `id-${role}`,
  name: role,
  email: `${role.toLowerCase()}@example.com`,
  role,
  branch: roleRequiresBranch(role) ? { id: 'branch-1', name: 'Main', code: 'M01' } : null,
});

describe('adminRbac', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('guards routes by module access', () => {
    const contentAdmin = makeUser('CONTENT_ADMIN');

    expect(canAccessModule(contentAdmin, 'cms')).toBe(true);
    expect(canAccessModule(contentAdmin, 'user-management')).toBe(false);
    expect(canAccessModule(null, 'dashboard')).toBe(false);
  });

  it('applies role access overrides from storage', () => {
    const branchManager = makeUser('BRANCH_MANAGER');

    expect(canAccessModule(branchManager, 'user-management')).toBe(false);

    setRoleAccessOverrides({
      BRANCH_MANAGER: ['dashboard', 'user-management'],
    });

    expect(canAccessModule(branchManager, 'user-management')).toBe(true);
  });

  it('returns null role for malformed session role', () => {
    const malformed = {
      id: 'broken',
      name: 'Broken User',
      email: 'broken@example.com',
      role: 'UNKNOWN_ROLE',
      branch: null,
    } as AdminUserSession;

    expect(getRoleForSession(malformed)).toBeNull();
  });
});
