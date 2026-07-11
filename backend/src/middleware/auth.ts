import { Request, Response, NextFunction } from 'express';
import { AdminRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { sendAuthInvalidError, sendAuthRequiredError, sendPermissionError } from '../utils/api-error';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    branchId: string | null;
    name: string;
  };
}

const isPreparedStatementLimitError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('max_prepared_stmt_count') || message.includes('code: `1461`') || message.includes('code: 1461');
};

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = (() => {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) {
        return null;
      }

      const cookies = cookieHeader.split(';').map((entry) => entry.trim());
      const sessionCookie = cookies.find((entry) => entry.startsWith('zemen_admin_token='));
      if (!sessionCookie) {
        return null;
      }

      return decodeURIComponent(sessionCookie.replace('zemen_admin_token=', ''));
    })();

    const token = bearerToken || cookieToken;
    if (!token) {
      sendAuthRequiredError(res);
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string;
      email: string;
      role: string;
    };

    let user = null as null | {
      id: string;
      email: string;
      role: string;
      branchId: string | null;
      name: string;
      isActive: boolean;
    };

    try {
      user = await prisma.adminUser.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, branchId: true, name: true, isActive: true },
      });
    } catch (error) {
      if (!isPreparedStatementLimitError(error)) {
        throw error;
      }

      user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        branchId: null,
        name: decoded.email,
        isActive: true,
      };
    }

    if (!user || !user.isActive) {
      sendAuthInvalidError(res, 'User not found or inactive');
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      name: user.name,
    };

    next();
  } catch {
    sendAuthInvalidError(res);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendAuthRequiredError(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendPermissionError(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

type AdminModule =
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

const defaultRoleModules: Record<AdminRole, AdminModule[]> = {
  SUPER_ADMIN: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'document-review', 'audit-log', 'cms', 'user-management', 'settings'],
  BRANCH_MANAGER: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'document-review', 'audit-log', 'settings'],
  MEMBERSHIP_OFFICER: ['dashboard', 'membership', 'members-list', 'document-review'],
  LOAN_OFFICER: ['dashboard', 'loan', 'loans-list', 'document-review'],
  KYC_OFFICER: ['dashboard', 'membership', 'loan', 'document-review'],
  CONTENT_ADMIN: ['dashboard', 'cms'],
};

const allowedModules = new Set<AdminModule>([
  'dashboard',
  'membership',
  'members-list',
  'loan',
  'loans-list',
  'document-review',
  'audit-log',
  'cms',
  'user-management',
  'settings',
]);

const getRoleModules = async (role: AdminRole): Promise<AdminModule[]> => {
  const overrideKey = `rbac.modules.${role}`;
  let override: { value: string } | null = null;

  try {
    override = await prisma.systemSetting.findUnique({
      where: { key: overrideKey },
      select: { value: true },
    });
  } catch (error) {
    if (!isPreparedStatementLimitError(error)) {
      throw error;
    }

    return defaultRoleModules[role];
  }

  if (!override?.value) {
    return defaultRoleModules[role];
  }

  try {
    const parsed = JSON.parse(override.value) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultRoleModules[role];
    }

    const filtered = parsed.filter((entry): entry is AdminModule => allowedModules.has(entry as AdminModule));
    return filtered.length ? filtered : defaultRoleModules[role];
  } catch {
    return defaultRoleModules[role];
  }
};

export const authorizeModule = (module: AdminModule) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendAuthRequiredError(res);
      return;
    }

    try {
      const role = req.user.role as AdminRole;
      const modules = await getRoleModules(role);

      if (!modules.includes(module)) {
        sendPermissionError(res, `Role ${role} does not have access to module ${module}`);
        return;
      }

      next();
    } catch {
      res.status(500).json({ error: 'Unable to evaluate module permissions' });
    }
  };
};
