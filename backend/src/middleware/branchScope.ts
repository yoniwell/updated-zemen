import { NextFunction, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';

const isSuperAdmin = (req: AuthRequest) => req.user?.role === 'SUPER_ADMIN';

const toBranchScopeKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\b(head office|branch|hq)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const computeBranchScope = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      req.scopedBranchIds = [] as unknown as string[];
      next();
      return;
    }

    if (isSuperAdmin(req)) {
      req.scopedBranchIds = null as unknown as string[] | null;
      next();
      return;
    }

    const scopedBranchId = req.user.branchId || null;
    if (!scopedBranchId) {
      req.scopedBranchIds = [] as unknown as string[];
      next();
      return;
    }

    // Branch managers may operate across naming variants for the same locality
    if (req.user.role !== 'BRANCH_MANAGER') {
      req.scopedBranchIds = [scopedBranchId];
      next();
      return;
    }

    const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
    const currentBranch = branches.find((b) => b.id === scopedBranchId);
    if (!currentBranch) {
      req.scopedBranchIds = [scopedBranchId];
      next();
      return;
    }

    const scopeKey = toBranchScopeKey(currentBranch.name);
    if (!scopeKey) {
      req.scopedBranchIds = [scopedBranchId];
      next();
      return;
    }

    const scopedBranchIds = branches.filter((b) => toBranchScopeKey(b.name) === scopeKey).map((b) => b.id);
    req.scopedBranchIds = scopedBranchIds.length > 0 ? scopedBranchIds : [scopedBranchId];
    next();
  } catch (error) {
    // On error, be conservative and deny access by setting empty scope
    req.scopedBranchIds = [] as unknown as string[];
    next();
  }
};

declare module './auth' {
  interface AuthRequest {
    scopedBranchIds?: string[] | null;
  }
}
