import type { AdminUserSession } from './adminAuth';

export const ADMIN_ROLE_VALUES = [
  'SUPER_ADMIN',
  'BRANCH_MANAGER',
  'OFFICER',
  'CONTENT_MANAGER',
] as const;

export type AdminRole = (typeof ADMIN_ROLE_VALUES)[number];

export type AdminModule =
  | 'dashboard'
  | 'membership'
  | 'members-list'
  | 'loan'
  | 'loans-list'
  | 'document-review'

  | 'audit-log'
  | 'cms'
  | 'user-management'
  | 'settings';

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  BRANCH_MANAGER: 'Branch Manager',
  OFFICER: 'Officer',
  CONTENT_MANAGER: 'Content Manager',
};

export const ROLE_ACCESS: Record<AdminRole, AdminModule[]> = {
  SUPER_ADMIN: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'document-review', 'audit-log', 'cms', 'user-management', 'settings'],
  BRANCH_MANAGER: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'user-management'],
  OFFICER: ['membership', 'members-list', 'loan', 'loans-list'],
  CONTENT_MANAGER: ['cms'],
};

const ROLE_ACCESS_OVERRIDE_KEY = 'zemen_role_access_overrides';

export const roleRequiresBranch = (role: AdminRole): boolean =>
  role === 'BRANCH_MANAGER' || role === 'OFFICER';

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLE_VALUES as readonly string[]).includes(value);
}

export function getRoleForSession(user: AdminUserSession | null): AdminRole | null {
  if (!user || !isAdminRole(user.role)) {
    return null;
  }
  return user.role;
}

export function canAccessModule(user: AdminUserSession | null, module: AdminModule): boolean {
  const role = getRoleForSession(user);
  if (!role) {
    return false;
  }
  return ROLE_ACCESS[role].includes(module);
}
