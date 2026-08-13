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
  BRANCH_MANAGER: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'audit-log'],
  OFFICER: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list'],
  CONTENT_MANAGER: ['cms'],
};

export type Permission =
  | 'dashboard:view'
  | 'membership:read'
  | 'membership:write'
  | 'membership:approve'
  | 'loans:read'
  | 'loans:write'
  | 'loans:approve'
  | 'members:read'
  | 'members:write'
  | 'documents:verify'
  | 'cms:read'
  | 'cms:write'
  | 'users:read'
  | 'users:write'
  | 'settings:read'
  | 'settings:write'
  | 'audit:read';

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard:view',
  'membership:read',
  'membership:write',
  'membership:approve',
  'loans:read',
  'loans:write',
  'loans:approve',
  'members:read',
  'members:write',
  'documents:verify',
  'cms:read',
  'cms:write',
  'users:read',
  'users:write',
  'settings:read',
  'settings:write',
  'audit:read',
];

export const ROLE_PERMISSIONS_MAP: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  BRANCH_MANAGER: [
    'dashboard:view',
    'membership:read',
    'membership:write',
    'membership:approve',
    'loans:read',
    'loans:write',
    'loans:approve',
    'members:read',
    'members:write',
    'documents:verify',
    'audit:read',
  ],
  OFFICER: [
    'dashboard:view',
    'membership:read',
    'membership:write',
    'membership:approve',
    'loans:read',
    'loans:write',
    'loans:approve',
    'members:read',
    'documents:verify',
  ],
  CONTENT_MANAGER: ['cms:read', 'cms:write'],
};

export const MODULE_REQUIRED_PERMISSIONS: Record<AdminModule, Permission> = {
  dashboard: 'dashboard:view',
  membership: 'membership:read',
  'members-list': 'members:read',
  loan: 'loans:read',
  'loans-list': 'loans:read',
  'document-review': 'documents:verify',
  'audit-log': 'audit:read',
  cms: 'cms:read',
  'user-management': 'users:read',
  settings: 'settings:read',
};

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

export function getPermissionsForUser(user: AdminUserSession | null): Permission[] {
  const role = getRoleForSession(user);
  if (!role) {
    return [];
  }
  return ROLE_PERMISSIONS_MAP[role] || [];
}

export function hasPermission(user: AdminUserSession | null, permission: Permission): boolean {
  const permissions = getPermissionsForUser(user);
  return permissions.includes(permission);
}

export function canAccessModule(user: AdminUserSession | null, module: AdminModule): boolean {
  const requiredPermission = MODULE_REQUIRED_PERMISSIONS[module];
  if (!requiredPermission) {
    return false;
  }
  return hasPermission(user, requiredPermission);
}
