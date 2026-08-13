import { AdminRole } from '@prisma/client';

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

  CONTENT_MANAGER: [
    'cms:read',
    'cms:write',
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  const normalizedRole = role as AdminRole;
  return ROLE_PERMISSIONS_MAP[normalizedRole] || [];
}

export function hasPermissionInRole(role: string, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}
