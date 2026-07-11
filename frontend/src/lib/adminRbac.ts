import type { AdminUserSession } from './adminAuth';

export const ADMIN_ROLE_VALUES = [
  'SUPER_ADMIN',
  'MEMBERSHIP_OFFICER',
  'LOAN_OFFICER',
  'KYC_OFFICER',
  'BRANCH_MANAGER',
  'CONTENT_ADMIN',
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
  MEMBERSHIP_OFFICER: 'Membership Officer',
  LOAN_OFFICER: 'Loan Officer',
  KYC_OFFICER: 'KYC Officer',
  BRANCH_MANAGER: 'Branch Manager',
  CONTENT_ADMIN: 'Content Admin',
};

export const ROLE_ACCESS: Record<AdminRole, AdminModule[]> = {
  SUPER_ADMIN: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'document-review', 'audit-log', 'cms', 'user-management', 'settings'],
  BRANCH_MANAGER: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'document-review', 'audit-log', 'settings'],
  MEMBERSHIP_OFFICER: ['dashboard', 'membership', 'members-list', 'document-review'],
  LOAN_OFFICER: ['dashboard', 'loan', 'loans-list', 'document-review'],
  KYC_OFFICER: ['dashboard', 'membership', 'loan', 'document-review'],
  CONTENT_ADMIN: ['dashboard', 'cms'],
};

const ROLE_ACCESS_OVERRIDE_KEY = 'zemen_role_access_overrides';

export const roleRequiresBranch = (role: AdminRole): boolean =>
  role === 'BRANCH_MANAGER' || role === 'MEMBERSHIP_OFFICER' || role === 'LOAN_OFFICER' || role === 'KYC_OFFICER';

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLE_VALUES as readonly string[]).includes(value);
}

export function getRoleForSession(user: AdminUserSession | null): AdminRole | null {
  if (!user || !isAdminRole(user.role)) {
    return null;
  }
  return user.role;
}

type RoleAccessOverrides = Partial<Record<AdminRole, AdminModule[]>>;

export function setRoleAccessOverrides(overrides: RoleAccessOverrides): void {
  localStorage.setItem(ROLE_ACCESS_OVERRIDE_KEY, JSON.stringify(overrides));
}

export function getRoleAccessOverrides(): RoleAccessOverrides {
  const raw = localStorage.getItem(ROLE_ACCESS_OVERRIDE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as RoleAccessOverrides;
  } catch {
    return {};
  }
}

function getEffectiveRoleAccess(role: AdminRole): AdminModule[] {
  const overrides = getRoleAccessOverrides();
  const override = overrides[role];

  if (override && override.length > 0) {
    return override;
  }

  return ROLE_ACCESS[role];
}

export function canAccessModule(user: AdminUserSession | null, module: AdminModule): boolean {
  const role = getRoleForSession(user);
  if (!role) {
    return false;
  }
  return getEffectiveRoleAccess(role).includes(module);
}
