import { Router, Response } from 'express';
import { AdminRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize, authorizeModule, AuthRequest } from '../middleware/auth';
import { revokeUserRefreshSessions } from '../services/session.service';
import { sendPermissionError, sendValidationError } from '../utils/api-error';
import { readFeatureFlags, updateFeatureFlags } from '../services/feature-flag.service';

const router = Router();

const isPreparedStatementLimitError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('max_prepared_stmt_count') || message.includes('code: `1461`') || message.includes('code: 1461');
};

const sendPreparedStatementFallback = (res: Response, payload: Record<string, unknown>): void => {
  res.setHeader('X-DB-Degraded', 'prepared-statement-limit');
  res.json({
    ...payload,
    degradedMode: true,
  });
};

const settingsRoles = ['SUPER_ADMIN', 'BRANCH_MANAGER'] as const;

const adminRoleValues = [
  'SUPER_ADMIN',
  'MEMBERSHIP_OFFICER',
  'LOAN_OFFICER',
  'KYC_OFFICER',
  'BRANCH_MANAGER',
  'CONTENT_ADMIN',
] as const;

const allowedModuleValues = [
  'dashboard',
  'membership',
  'members-list',
  'loan',
  'loans-list',
  'document-review',
  'notifications',
  'audit-log',
  'cms',
  'user-management',
  'settings',
] as const;

const roleAccessMatrix: Record<AdminRole, { label: string; modules: string[] }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    modules: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'document-review', 'audit-log', 'cms', 'user-management', 'settings'],
  },
  BRANCH_MANAGER: {
    label: 'Branch Manager',
    modules: ['dashboard', 'membership', 'members-list', 'loan', 'loans-list', 'document-review', 'audit-log', 'settings'],
  },
  MEMBERSHIP_OFFICER: {
    label: 'Membership Officer',
    modules: ['dashboard', 'membership', 'members-list', 'document-review'],
  },
  LOAN_OFFICER: {
    label: 'Loan Officer',
    modules: ['dashboard', 'loan', 'loans-list', 'document-review'],
  },
  KYC_OFFICER: {
    label: 'KYC Officer',
    modules: ['dashboard', 'membership', 'loan', 'document-review'],
  },
  CONTENT_ADMIN: {
    label: 'Content Admin',
    modules: ['dashboard', 'cms'],
  },
};

const systemSettingsSchema = z.object({
  loanApprovalThreshold: z.number().int().positive().optional(),
  automatedAssignment: z.enum(['ROUND_ROBIN', 'BRANCH_POOL', 'MANUAL']).optional(),
  complianceLock: z.boolean().optional(),
  dualControlEnabled: z.boolean().optional(),
});

const featureFlagsSchema = z
  .object({
    enableBackgroundExportQueue: z.boolean().optional(),
    enableSloDashboard: z.boolean().optional(),
    enableAuditPolicyDashboard: z.boolean().optional(),
    enableStrictSensitiveDataPolicy: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one feature flag value is required',
  });

const dualControlApprovalSchema = z.object({
  approverEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  approverPassword: z.string().min(8).max(128),
});

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(adminRoleValues),
  branchId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    role: z.enum(adminRoleValues).optional(),
    branchId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
    approval: dualControlApprovalSchema.optional(),
  })
  .refine((value) => Object.keys(value).some((key) => key !== 'approval'), {
    message: 'At least one field is required',
  });

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
  approval: dualControlApprovalSchema.optional(),
});

const deactivateUserSchema = z.object({
  reason: z.string().trim().min(5).max(500).optional(),
  approval: dualControlApprovalSchema.optional(),
});

const updateRoleAccessSchema = z.object({
  modules: z.array(z.enum(allowedModuleValues)).min(1),
});

const roleImpactPreviewSchema = z.object({
  role: z.enum(adminRoleValues).optional(),
  branchId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const bulkUserActionSchema = z.object({
  action: z.enum(['ACTIVATE', 'DEACTIVATE', 'ASSIGN_BRANCH']),
  userIds: z.array(z.string().uuid()).min(1).max(100),
  branchId: z.string().uuid().nullable().optional(),
  reason: z.string().trim().min(5).max(500).optional(),
  approval: dualControlApprovalSchema.optional(),
});

const createBranchSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  location: z.string().trim().min(1),
  manager: z.string().trim().nullable().optional(),
  status: z.string().trim().optional(),
});

const updateBranchSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    manager: z.string().trim().nullable().optional(),
    status: z.string().trim().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const isAdminRole = (role: string): role is AdminRole =>
  (adminRoleValues as readonly string[]).includes(role);

const roleNeedsBranch = (role: AdminRole): boolean =>
  role === 'BRANCH_MANAGER' || role === 'MEMBERSHIP_OFFICER' || role === 'LOAN_OFFICER' || role === 'KYC_OFFICER';

const sanitizeAdminUser = (user: {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  branchId: string | null;
  branch: { id: string; name: string; code: string } | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  branchId: user.branchId,
  branch: user.branch,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const countActiveSuperAdmins = async (): Promise<number> => {
  return prisma.adminUser.count({
    where: {
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
};

type SystemSettings = {
  loanApprovalThreshold: number;
  automatedAssignment: 'ROUND_ROBIN' | 'BRANCH_POOL' | 'MANUAL';
  complianceLock: boolean;
  dualControlEnabled: boolean;
};

const defaultSystemSettings: SystemSettings = {
  loanApprovalThreshold: 5000000,
  automatedAssignment: 'ROUND_ROBIN',
  complianceLock: true,
  dualControlEnabled: false,
};

const settingsKeyMap = {
  loanApprovalThreshold: 'system.loanApprovalThreshold',
  automatedAssignment: 'system.automatedAssignment',
  complianceLock: 'system.complianceLock',
  dualControlEnabled: 'security.dualControlEnabled',
} as const;

const defaultBranchSeedData = [
  { name: 'Mekelle Head Office', code: 'MK-HQ', location: 'Mekelle', manager: null, status: 'OPERATIONAL' },
  { name: 'Mekelle Branch', code: 'MK-001', location: 'Mekelle', manager: null, status: 'OPERATIONAL' },
  { name: 'Addis Abeba', code: 'AA-001', location: 'Addis Abeba', manager: null, status: 'OPERATIONAL' },
  { name: 'Adigrat', code: 'ADG-001', location: 'Adigrat', manager: null, status: 'OPERATIONAL' },
  { name: 'AbiAdi', code: 'ABI-001', location: 'AbiAdi', manager: null, status: 'OPERATIONAL' },
  { name: 'Maychow', code: 'MYC-001', location: 'Maychow', manager: null, status: 'OPERATIONAL' },
  { name: 'Adwa', code: 'ADW-001', location: 'Adwa', manager: null, status: 'OPERATIONAL' },
  { name: 'Shire', code: 'SHR-001', location: 'Shire', manager: null, status: 'OPERATIONAL' },
  { name: 'Rama', code: 'RAM-001', location: 'Rama', manager: null, status: 'OPERATIONAL' },
] as const;

const emailVerificationKeyPrefix = 'admin.email_verified.';

async function readSystemSettings(): Promise<SystemSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          settingsKeyMap.loanApprovalThreshold,
          settingsKeyMap.automatedAssignment,
          settingsKeyMap.complianceLock,
          settingsKeyMap.dualControlEnabled,
        ],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const map = new Map(rows.map((row) => [row.key, row.value]));

  const thresholdValue = Number(map.get(settingsKeyMap.loanApprovalThreshold));
  const assignmentValue = map.get(settingsKeyMap.automatedAssignment);
  const complianceValue = map.get(settingsKeyMap.complianceLock);
  const dualControlValue = map.get(settingsKeyMap.dualControlEnabled);

  return {
    loanApprovalThreshold: Number.isFinite(thresholdValue) ? thresholdValue : defaultSystemSettings.loanApprovalThreshold,
    automatedAssignment:
      assignmentValue === 'ROUND_ROBIN' || assignmentValue === 'BRANCH_POOL' || assignmentValue === 'MANUAL'
        ? assignmentValue
        : defaultSystemSettings.automatedAssignment,
    complianceLock: complianceValue === 'true' ? true : complianceValue === 'false' ? false : defaultSystemSettings.complianceLock,
    dualControlEnabled:
      dualControlValue === 'true' ? true : dualControlValue === 'false' ? false : defaultSystemSettings.dualControlEnabled,
  };
}

async function validateDualControlApproval(params: {
  actorId: string;
  targetUserId: string;
  actionLabel: string;
  approval: { approverEmail: string; approverPassword: string } | undefined;
  ipAddress?: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const settings = await readSystemSettings();
  if (!settings.dualControlEnabled) {
    return { ok: true };
  }

  if (!params.approval) {
    return { ok: false, status: 400, error: 'Dual-control approval is required for this action' };
  }

  const approver = await prisma.adminUser.findUnique({
    where: { email: params.approval.approverEmail },
    select: { id: true, email: true, passwordHash: true, role: true, isActive: true },
  });

  if (!approver || !approver.isActive || approver.role !== 'SUPER_ADMIN') {
    return { ok: false, status: 403, error: 'Approver must be an active SUPER_ADMIN' };
  }

  if (approver.id === params.actorId) {
    return { ok: false, status: 400, error: 'Requester cannot self-approve a dual-control action' };
  }

  if (approver.id === params.targetUserId) {
    return { ok: false, status: 400, error: 'Target user cannot approve this action' };
  }

  const isValidPassword = await bcrypt.compare(params.approval.approverPassword, approver.passwordHash);
  if (!isValidPassword) {
    return { ok: false, status: 401, error: 'Invalid approver credentials' };
  }

  await prisma.auditLog.create({
    data: {
      userId: approver.id,
      action: 'DUAL_CONTROL_APPROVED',
      targetType: 'ADMIN_USER',
      targetId: params.targetUserId,
      details: `${params.actionLabel} approved for requester ${params.actorId}`,
      ipAddress: params.ipAddress || null,
    },
  });

  return { ok: true };
}

async function writeSystemSetting(key: string, value: string) {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: {
      key,
      value,
    },
  });
}

async function ensureBranchExists(branchId: string): Promise<boolean> {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
  return Boolean(branch);
}

async function ensureDefaultBranches(): Promise<void> {
  // Only seed default branches if the table is empty to avoid re‑creating deleted entries on each fetch.
  const existingCount = await prisma.branch.count();
  if (existingCount === 0) {
    await prisma.branch.createMany({
      data: [...defaultBranchSeedData],
      skipDuplicates: true,
    });
  }
}

async function readEmailVerificationMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const keys = userIds.map((id) => `${emailVerificationKeyPrefix}${id}`);
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: keys,
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    const userId = row.key.replace(emailVerificationKeyPrefix, '');
    if (userId) {
      map.set(userId, row.value);
    }
  }

  return map;
}

async function logUserManagementAudit(
  actorId: string,
  action: string,
  targetId: string,
  details: string,
  ipAddress?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action,
      targetType: 'ADMIN_USER',
      targetId,
      details,
      ipAddress: ipAddress || null,
    },
  });
}

async function readRoleModuleOverrides(): Promise<Partial<Record<AdminRole, string[]>>> {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        startsWith: 'rbac.modules.',
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const overrides: Partial<Record<AdminRole, string[]>> = {};
  for (const row of rows) {
    const role = row.key.replace('rbac.modules.', '') as AdminRole;
    if (!isAdminRole(role)) {
      continue;
    }

    try {
      const parsed = JSON.parse(row.value) as string[];
      if (Array.isArray(parsed)) {
        overrides[role] = parsed.filter((module): module is string =>
          (allowedModuleValues as readonly string[]).includes(module)
        );
      }
    } catch {
      continue;
    }
  }

  return overrides;
}

router.get('/access-control', authenticate, authorizeModule('settings'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const overrides = await readRoleModuleOverrides();

    res.json({
      roles: adminRoleValues.map((role) => ({
        role,
        label: roleAccessMatrix[role].label,
        modules: overrides[role] && overrides[role]!.length > 0 ? overrides[role] : roleAccessMatrix[role].modules,
        branchRequired: roleNeedsBranch(role),
      })),
    });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      sendPreparedStatementFallback(res, {
        roles: adminRoleValues.map((role) => ({
          role,
          label: roleAccessMatrix[role].label,
          modules: roleAccessMatrix[role].modules,
          branchRequired: roleNeedsBranch(role),
        })),
      });
      return;
    }

    console.error('Get access control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/access-control/:role', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = (Array.isArray(req.params.role) ? req.params.role[0] : req.params.role) as string;
    if (!isAdminRole(role)) {
      res.status(400).json({ error: 'Invalid role value' });
      return;
    }

    const parsed = updateRoleAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid access payload', details: parsed.error.issues });
      return;
    }

    const modules = Array.from(new Set(parsed.data.modules));
    await writeSystemSetting(`rbac.modules.${role}`, JSON.stringify(modules));

    res.json({
      role,
      modules,
      branchRequired: roleNeedsBranch(role),
      label: roleAccessMatrix[role].label,
    });
  } catch (error) {
    console.error('Update role access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/system', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await readSystemSettings();
    res.json({ settings });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      sendPreparedStatementFallback(res, { settings: defaultSystemSettings });
      return;
    }

    console.error('Get system settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/feature-flags', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const flags = await readFeatureFlags();
    res.json({ flags });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      sendPreparedStatementFallback(res, {
        flags: {
          enableBackgroundExportQueue: false,
          enableSloDashboard: true,
          enableAuditPolicyDashboard: true,
          enableStrictSensitiveDataPolicy: true,
        },
      });
      return;
    }

    console.error('Get feature flags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/feature-flags', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = featureFlagsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      sendValidationError(res, 'Invalid feature flags payload', parsed.error.issues);
      return;
    }

    const flags = await updateFeatureFlags(parsed.data);
    res.json({ flags });
  } catch (error) {
    console.error('Update feature flags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/environment-drift', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'CORS_ORIGIN',
      'UPLOAD_DIR',
      'AUDIT_LOG_RETENTION_DAYS',
      'NOTIFICATION_RETENTION_DAYS',
      'DATA_RETENTION_INTERVAL_MINUTES',
      'BACKGROUND_QUEUE_POLL_MS',
      'AUDIT_EXPORT_SIGNING_SECRET',
    ];

    const optionalVars = ['ADMIN_INVITE_BASE_URL', 'NODE_ENV', 'PORT'];

    const missingRequired = requiredVars.filter((key) => !process.env[key]);
    const configuredOptional = optionalVars.filter((key) => Boolean(process.env[key]));
    const envHash = crypto
      .createHash('sha256')
      .update(
        [...requiredVars, ...optionalVars]
          .sort()
          .map((key) => `${key}:${process.env[key] ? 'set' : 'unset'}`)
          .join('|')
      )
      .digest('hex');

    res.json({
      asOf: new Date().toISOString(),
      status: missingRequired.length === 0 ? 'HEALTHY' : 'DRIFT_DETECTED',
      checks: {
        requiredVars,
        optionalVars,
        missingRequired,
        configuredOptional,
      },
      baseline: {
        envHash,
      },
    });
  } catch (error) {
    console.error('Environment drift check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/system', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = systemSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid system settings payload', details: parsed.error.issues });
      return;
    }

    const { loanApprovalThreshold, automatedAssignment, complianceLock, dualControlEnabled } = parsed.data;

    if (typeof loanApprovalThreshold === 'number') {
      await writeSystemSetting(settingsKeyMap.loanApprovalThreshold, String(loanApprovalThreshold));
    }

    if (automatedAssignment) {
      await writeSystemSetting(settingsKeyMap.automatedAssignment, automatedAssignment);
    }

    if (typeof complianceLock === 'boolean') {
      await writeSystemSetting(settingsKeyMap.complianceLock, String(complianceLock));
    }

    if (typeof dualControlEnabled === 'boolean') {
      await writeSystemSetting(settingsKeyMap.dualControlEnabled, String(dualControlEnabled));
    }

    const settings = await readSystemSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/branches', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureDefaultBranches();
    const branches = await prisma.branch.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ branches });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      sendPreparedStatementFallback(res, { branches: [] });
      return;
    }

    console.error('List branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/branches', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid branch payload', parsed.error.issues);
      return;
    }

    const { name, code, location, manager, status } = parsed.data;

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        location,
        manager: manager || null,
        status: status || 'OPERATIONAL',
      },
    });

    res.status(201).json({ branch });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/branches/:id', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid branch update payload', parsed.error.issues);
      return;
    }

    const { name, code, location, manager, status } = parsed.data;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        code,
        location,
        manager,
        status,
      },
    });

    res.json({ branch });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================
// PART 2: BACKEND ROUTE HANDLER (PLACE IN YOUR SETTINGS ROUTES FILE)
// =========================================================
router.delete('/branches/:id', authenticate, authorize(...settingsRoles), authorizeModule('settings'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Clean and validate the parameter string coming from the frontend URL
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = String(rawId).trim(); 

    console.log(`🚀 [Backend Debug] Received explicit delete instruction for Branch ID parameter: "${id}"`);

    if (!id || id === 'undefined' || id === '[object Object]' || id === '') {
      console.warn("⚠️ [Backend Debug] Blocked deletion attempt: Incoming ID string parameter is empty or malformed.");
      res.status(400).json({ error: 'Invalid or poorly formed Branch ID query argument parameter.' });
      return;
    }

    // 1. Verify that the branch actually exists in your database
    const branch = await prisma.branch.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!branch) {
      console.warn(`⚠️ [Backend Debug] Branch with ID "${id}" was not found in the database directory.`);
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    console.log(`♻️ [Backend Debug] Found branch "${id}". Launching cleanup database transactions...`);

    // 2. Execute atomic transactional clearing across related data models
    await prisma.$transaction(async (tx) => {
      // Disconnect all system administrators linked to this branch location
      await tx.adminUser.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      });

      // Disconnect member directory entries linked to this branch location
      await tx.membershipApplication.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      });

      // Disconnect loan directory entries linked to this branch location
      await tx.loanApplication.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      });

      // Permanently purge the branch profile record row
      await tx.branch.delete({ where: { id } });
    });

    console.log(`✅ [Backend Debug] Branch "${id}" and its relational links were successfully purged.`);
    res.json({ success: true });
  } catch (error) {
    console.error('💥 [Backend Debug] Exception caught inside server handler route:', error);
    res.status(500).json({ error: 'Internal server query transaction execution failure.' });
  }
});


router.get('/users', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '20'), 10)));
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const isCursorMode = Boolean(cursor);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim().toLowerCase();
    const role = String(req.query.role || '').trim();
    const status = String(req.query.status || '').trim();
    const sortBy = ['name', 'email', 'role', 'createdAt', 'lastLogin'].includes(String(req.query.sortBy || 'createdAt'))
      ? (String(req.query.sortBy || 'createdAt') as 'name' | 'email' | 'role' | 'createdAt' | 'lastLogin')
      : 'createdAt';
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: Prisma.AdminUserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role && isAdminRole(role)) {
      where.role = role;
    }
    if (status === 'active') {
      where.isActive = true;
    }
    if (status === 'inactive') {
      where.isActive = false;
    }

    const users = await prisma.adminUser.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ [sortBy]: sortOrder }, { id: sortOrder }],
      ...(isCursorMode
        ? {
            cursor: { id: String(cursor) },
            skip: 1,
            take: limit,
          }
        : {
            skip,
            take: limit,
          }),
    });

    const total = isCursorMode ? 0 : await prisma.adminUser.count({ where });
    const emailVerificationMap = await readEmailVerificationMap(users.map((user) => user.id));

    const sanitizedUsers = users.map((user) => {
      const emailVerifiedAt = emailVerificationMap.get(user.id) || null;
      return {
        ...sanitizeAdminUser(user),
        emailVerifiedAt,
        emailVerified: Boolean(emailVerifiedAt),
      };
    });

    const nextCursor = sanitizedUsers.length === limit ? sanitizedUsers[sanitizedUsers.length - 1].id : null;

    res.json({
      users: sanitizedUsers,
      pagination: {
        total: isCursorMode ? null : total,
        page,
        limit,
        mode: isCursorMode ? 'cursor' : 'offset',
        nextCursor,
      },
    });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      const fallbackPage = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const fallbackLimit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '20'), 10)));
      sendPreparedStatementFallback(res, {
        users: [],
        pagination: {
          total: 0,
          page: fallbackPage,
          limit: fallbackLimit,
          mode: 'offset',
          nextCursor: null,
        },
      });
      return;
    }

    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/role-impact-preview', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = roleImpactPreviewSchema.safeParse(req.body || {});
    if (!parsed.success) {
      sendValidationError(res, 'Invalid role impact preview payload', parsed.error.issues);
      return;
    }

    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, role: true, branchId: true, isActive: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const proposedRole = parsed.data.role ?? user.role;
    const proposedBranchId = parsed.data.branchId !== undefined ? parsed.data.branchId : user.branchId;
    const proposedIsActive = parsed.data.isActive ?? user.isActive;

    const overrides = await readRoleModuleOverrides();
    const currentModules = overrides[user.role] && overrides[user.role]!.length > 0 ? overrides[user.role]! : roleAccessMatrix[user.role].modules;
    const proposedModules = overrides[proposedRole] && overrides[proposedRole]!.length > 0 ? overrides[proposedRole]! : roleAccessMatrix[proposedRole].modules;

    const gainedModules = proposedModules.filter((module) => !currentModules.includes(module));
    const removedModules = currentModules.filter((module) => !proposedModules.includes(module));

    const impacts: Array<{ level: 'info' | 'warning' | 'error'; code: string; message: string }> = [];
    if (user.role !== proposedRole) {
      impacts.push({
        level: 'warning',
        code: 'ROLE_CHANGE',
        message: `Role will change from ${user.role} to ${proposedRole}.`,
      });
    }
    if (removedModules.length > 0) {
      impacts.push({
        level: 'warning',
        code: 'MODULE_ACCESS_REMOVED',
        message: `Access removed: ${removedModules.join(', ')}.`,
      });
    }
    if (gainedModules.length > 0) {
      impacts.push({
        level: 'info',
        code: 'MODULE_ACCESS_ADDED',
        message: `Access added: ${gainedModules.join(', ')}.`,
      });
    }
    if (roleNeedsBranch(proposedRole) && !proposedBranchId) {
      impacts.push({
        level: 'error',
        code: 'BRANCH_REQUIRED',
        message: `Role ${proposedRole} requires a branch assignment.`,
      });
    }

    if (user.role === 'SUPER_ADMIN' && (proposedRole !== 'SUPER_ADMIN' || !proposedIsActive) && user.isActive) {
      const activeSuperAdminCount = await countActiveSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        impacts.push({
          level: 'error',
          code: 'LAST_SUPER_ADMIN_GUARD',
          message: 'This change would remove the last active SUPER_ADMIN.',
        });
      }
    }

    res.json({
      current: {
        role: user.role,
        branchId: user.branchId,
        isActive: user.isActive,
        modules: currentModules,
      },
      proposed: {
        role: proposedRole,
        branchId: proposedBranchId,
        isActive: proposedIsActive,
        modules: proposedModules,
      },
      impacts,
      blockers: impacts.filter((impact) => impact.level === 'error'),
      canSave: impacts.every((impact) => impact.level !== 'error'),
    });
  } catch (error) {
    console.error('Role impact preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid user payload', details: parsed.error.issues });
      return;
    }

    const { name, email, password, role, branchId, isActive } = parsed.data;

    if (roleNeedsBranch(role) && !branchId) {
      res.status(400).json({ error: `Role ${role} requires branchId` });
      return;
    }

    if (branchId) {
      const branchExists = await ensureBranchExists(branchId);
      if (!branchExists) {
        res.status(400).json({ error: 'branchId does not exist' });
        return;
      }
    }

    const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.adminUser.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        branchId: roleNeedsBranch(role) ? branchId || null : branchId || null,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (req.user?.id) {
      await logUserManagementAudit(
        req.user.id,
        'USER_CREATED',
        user.id,
        `Created admin user ${user.email} with role ${user.role}`,
        req.ip
      );
    }

    res.status(201).json({ user: sanitizeAdminUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Unique constraint violation' });
      return;
    }

    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateUserSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, 'Invalid update payload', parsed.error.issues);
      return;
    }

    const existingUser = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, role: true, branchId: true, isActive: true },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updates = parsed.data;
    const actorId = req.user?.id;
    if (!actorId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const targetRole = updates.role ?? existingUser.role;
    const targetIsActive = updates.isActive ?? existingUser.isActive;
    const targetBranchId = updates.branchId !== undefined ? updates.branchId : existingUser.branchId;

    if (req.user?.id === id && updates.isActive === false) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    if ((existingUser.role === 'SUPER_ADMIN' || targetRole === 'SUPER_ADMIN') && !targetIsActive) {
      const activeSuperAdminCount = await countActiveSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        res.status(400).json({ error: 'At least one active SUPER_ADMIN must remain' });
        return;
      }
    }

    if (existingUser.role === 'SUPER_ADMIN' && targetRole !== 'SUPER_ADMIN') {
      const activeSuperAdminCount = await countActiveSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        res.status(400).json({ error: 'Cannot change role of the last active SUPER_ADMIN' });
        return;
      }
    }

    if (roleNeedsBranch(targetRole) && !targetBranchId) {
      res.status(400).json({ error: `Role ${targetRole} requires branchId` });
      return;
    }

    if (targetBranchId) {
      const branchExists = await ensureBranchExists(targetBranchId);
      if (!branchExists) {
        res.status(400).json({ error: 'branchId does not exist' });
        return;
      }
    }

    if (updates.email) {
      const emailHolder = await prisma.adminUser.findUnique({ where: { email: updates.email }, select: { id: true } });
      if (emailHolder && emailHolder.id !== id) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }
    }

    const isHighRiskUpdate =
      (updates.role !== undefined && updates.role !== existingUser.role) ||
      updates.isActive === false ||
      Boolean(updates.password);

    if (isHighRiskUpdate) {
      const approvalResult = await validateDualControlApproval({
        actorId,
        targetUserId: id,
        actionLabel: 'USER_UPDATE_HIGH_RISK',
        approval: updates.approval,
        ipAddress: req.ip,
      });

      if (!approvalResult.ok) {
        if (approvalResult.status === 403) {
          sendPermissionError(res, approvalResult.error);
        } else {
          sendValidationError(res, approvalResult.error);
        }
        return;
      }
    }

    const passwordHash = updates.password ? await bcrypt.hash(updates.password, 10) : undefined;

    const user = await prisma.adminUser.update({
      where: { id },
      data: {
        name: updates.name,
        email: updates.email,
        role: updates.role,
        branchId: updates.branchId,
        isActive: updates.isActive,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (updates.password || updates.isActive === false) {
      await revokeUserRefreshSessions(id);
    }

    if (req.user?.id) {
      await logUserManagementAudit(
        req.user.id,
        'USER_UPDATED',
        user.id,
        `Updated admin user ${user.email} role=${user.role} active=${String(user.isActive)}`,
        req.ip
      );
    }

    res.json({ user: sanitizeAdminUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Unique constraint violation' });
      return;
    }

    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/users/:id/password', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      sendValidationError(res, 'Invalid password payload', parsed.error.issues);
      return;
    }

    const existing = await prisma.adminUser.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const actorId = req.user?.id;
    if (!actorId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const approvalResult = await validateDualControlApproval({
      actorId,
      targetUserId: id,
      actionLabel: 'USER_PASSWORD_RESET',
      approval: parsed.data.approval,
      ipAddress: req.ip,
    });

    if (!approvalResult.ok) {
      if (approvalResult.status === 403) {
        sendPermissionError(res, approvalResult.error);
      } else {
        sendValidationError(res, approvalResult.error);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.adminUser.update({ where: { id }, data: { passwordHash } });
    await revokeUserRefreshSessions(id);

    const resetTarget = await prisma.adminUser.findUnique({ where: { id }, select: { email: true } });
    if (req.user?.id) {
      await logUserManagementAudit(
        req.user.id,
        'USER_PASSWORD_RESET',
        id,
        `Reset password for admin user ${resetTarget?.email || id}`,
        req.ip
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/bulk', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = bulkUserActionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid bulk action payload', parsed.error.issues);
      return;
    }

    const actorId = req.user?.id;
    if (!actorId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const uniqueIds = Array.from(new Set(parsed.data.userIds));
    const users = await prisma.adminUser.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (users.length !== uniqueIds.length) {
      res.status(404).json({ error: 'One or more users were not found' });
      return;
    }

    if (parsed.data.action === 'ASSIGN_BRANCH') {
      if (!parsed.data.branchId) {
        res.status(400).json({ error: 'branchId is required for ASSIGN_BRANCH action' });
        return;
      }

      const branchExists = await ensureBranchExists(parsed.data.branchId);
      if (!branchExists) {
        res.status(400).json({ error: 'branchId does not exist' });
        return;
      }

      const result = await prisma.adminUser.updateMany({
        where: { id: { in: uniqueIds } },
        data: { branchId: parsed.data.branchId },
      });

      await logUserManagementAudit(
        actorId,
        'USER_BULK_BRANCH_REASSIGNED',
        uniqueIds.join(','),
        parsed.data.reason
          ? `Bulk reassigned branch to ${parsed.data.branchId} for ${result.count} users. Reason: ${parsed.data.reason}`
          : `Bulk reassigned branch to ${parsed.data.branchId} for ${result.count} users`,
        req.ip
      );

      res.json({ success: true, action: parsed.data.action, affectedCount: result.count });
      return;
    }

    if (parsed.data.action === 'DEACTIVATE') {
      if (uniqueIds.includes(actorId)) {
        res.status(400).json({ error: 'You cannot deactivate your own account' });
        return;
      }

      const activeSuperAdminsToDeactivate = users.filter((user) => user.role === 'SUPER_ADMIN' && user.isActive).length;
      if (activeSuperAdminsToDeactivate > 0) {
        const activeSuperAdminCount = await countActiveSuperAdmins();
        if (activeSuperAdminCount - activeSuperAdminsToDeactivate < 1) {
          res.status(400).json({ error: 'At least one active SUPER_ADMIN must remain' });
          return;
        }
      }

      const approvalResult = await validateDualControlApproval({
        actorId,
        targetUserId: uniqueIds[0],
        actionLabel: 'USER_BULK_DEACTIVATION',
        approval: parsed.data.approval,
        ipAddress: req.ip,
      });

      if (!approvalResult.ok) {
        if (approvalResult.status === 403) {
          sendPermissionError(res, approvalResult.error);
        } else {
          sendValidationError(res, approvalResult.error);
        }
        return;
      }
    }

    const shouldActivate = parsed.data.action === 'ACTIVATE';
    const result = await prisma.adminUser.updateMany({
      where: { id: { in: uniqueIds } },
      data: { isActive: shouldActivate },
    });

    if (!shouldActivate) {
      for (const userId of uniqueIds) {
        await revokeUserRefreshSessions(userId);
      }
    }

    await logUserManagementAudit(
      actorId,
      shouldActivate ? 'USER_BULK_ACTIVATED' : 'USER_BULK_DEACTIVATED',
      uniqueIds.join(','),
      parsed.data.reason
        ? `Bulk ${shouldActivate ? 'activated' : 'deactivated'} ${result.count} users. Reason: ${parsed.data.reason}`
        : `Bulk ${shouldActivate ? 'activated' : 'deactivated'} ${result.count} users`,
      req.ip
    );

    res.json({ success: true, action: parsed.data.action, affectedCount: result.count });
  } catch (error) {
    console.error('Bulk user action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const approvalParsed = deactivateUserSchema.safeParse(req.body || {});
    if (!approvalParsed.success) {
      sendValidationError(res, 'Invalid deactivation payload', approvalParsed.error.issues);
      return;
    }

    const actorId = req.user?.id;
    if (!actorId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user?.id === id) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    const existingUser = await prisma.adminUser.findUnique({ where: { id }, select: { role: true, isActive: true } });
    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (existingUser.role === 'SUPER_ADMIN' && existingUser.isActive) {
      const activeSuperAdminCount = await countActiveSuperAdmins();
      if (activeSuperAdminCount <= 1) {
        res.status(400).json({ error: 'At least one active SUPER_ADMIN must remain' });
        return;
      }
    }

    const approvalResult = await validateDualControlApproval({
      actorId,
      targetUserId: id,
      actionLabel: 'USER_DEACTIVATION',
      approval: approvalParsed.data.approval,
      ipAddress: req.ip,
    });

    if (!approvalResult.ok) {
      if (approvalResult.status === 403) {
        sendPermissionError(res, approvalResult.error);
      } else {
        sendValidationError(res, approvalResult.error);
      }
      return;
    }

    await prisma.adminUser.update({ where: { id }, data: { isActive: false } });
    await revokeUserRefreshSessions(id);

    const deactivatedUser = await prisma.adminUser.findUnique({ where: { id }, select: { email: true } });
    if (req.user?.id) {
      await logUserManagementAudit(
        req.user.id,
        'USER_DEACTIVATED',
        id,
        approvalParsed.data.reason
          ? `Deactivated admin user ${deactivatedUser?.email || id}. Reason: ${approvalParsed.data.reason}`
          : `Deactivated admin user ${deactivatedUser?.email || id}`,
        req.ip
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/invite', authenticate, authorize('SUPER_ADMIN'), authorizeModule('user-management'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true, isActive: true } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.isActive) {
      res.status(400).json({ error: 'Cannot invite inactive user' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const emailVerificationToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    await writeSystemSetting(
      `invite.token.${token}`,
      JSON.stringify({ userId: id, email: user.email, expiresAt, emailVerificationToken, emailVerifiedAt: null })
    );
    await prisma.systemSetting.delete({ where: { key: `${emailVerificationKeyPrefix}${id}` } }).catch(() => undefined);

    await prisma.notificationEvent.create({
      data: {
        status: 'INFO',
        title: `User invitation generated for ${user.email} (email verification pending)`,
        recipient: user.email,
        type: 'SYSTEM',
      },
    });

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'USER_INVITED',
          targetType: 'ADMIN_USER',
          targetId: user.id,
          details: `Generated invite link for ${user.email}`,
          ipAddress: req.ip || null,
        },
      });
    }

    const configuredInviteBaseUrl = (process.env.ADMIN_INVITE_BASE_URL || '').trim();
    if (process.env.NODE_ENV === 'production' && configuredInviteBaseUrl.length === 0) {
      res.status(500).json({ error: 'ADMIN_INVITE_BASE_URL is required in production' });
      return;
    }

    const inviteBaseUrl = configuredInviteBaseUrl || 'http://localhost:3000/admin/login';
    const inviteUrl = `${inviteBaseUrl}?invite=${token}`;
    const verificationUrl = `${inviteBaseUrl}?invite=${token}&verify=${emailVerificationToken}`;
    res.json({ success: true, inviteUrl, verificationUrl, expiresAt });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
