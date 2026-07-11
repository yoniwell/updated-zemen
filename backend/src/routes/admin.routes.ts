import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, authorize, authorizeModule, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { getSecurityAbuseMetrics } from '../services/security-monitor.service';
import { buildLoanApprovedTemplate, buildMembershipApprovedTemplate, sendNotification } from '../services/notification.service';
import { sanitizeFreeText } from '../utils/text-sanitizer';
import { idempotency } from '../middleware/idempotency';

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

const reviewerRoles = [
  'SUPER_ADMIN',
  'BRANCH_MANAGER',
  'MEMBERSHIP_OFFICER',
  'LOAN_OFFICER',
  'KYC_OFFICER',
] as const;

type ApplicationType = 'membership' | 'loan';

const applicationStatusValues = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'KYC_VERIFICATION',
  'PENDING_DOCUMENTS',
  'PENDING_CLARIFICATION',
  'APPROVED',
  'REJECTED',
  'ACTIVATED',
] as const;

const assignSchema = z.object({
  assignedToId: z.string().uuid().nullable().optional(),
  expectedUpdatedAt: z.string().datetime(),
});

const sanitizedTextSchema = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .transform((value) => sanitizeFreeText(value))
    .refine((value) => value.length > 0, 'Value cannot be empty after sanitization');

const updateStatusSchema = z.object({
  status: z.enum(applicationStatusValues),
  note: sanitizedTextSchema(1000).optional(),
  expectedUpdatedAt: z.string().datetime(),
});

const requestInfoReasonTemplates = [
  {
    id: 'MISSING_CORE_KYC',
    label: 'Missing Core KYC Documents',
    text: 'Please submit missing core KYC documents to continue review.',
  },
  {
    id: 'INCOME_PROOF_INCOMPLETE',
    label: 'Income Proof Incomplete',
    text: 'Please provide complete and recent proof of income documents.',
  },
  {
    id: 'CLARIFY_APPLICATION_DETAILS',
    label: 'Clarify Application Details',
    text: 'Please clarify incomplete or inconsistent information in your application.',
  },
] as const;

const documentRejectReasonTemplates = [
  {
    id: 'UNREADABLE_DOCUMENT',
    label: 'Unreadable Document',
    text: 'The uploaded document is unreadable. Please upload a clear copy.',
  },
  {
    id: 'EXPIRED_DOCUMENT',
    label: 'Expired Document',
    text: 'The uploaded document is expired. Please upload a valid document.',
  },
  {
    id: 'MISMATCHED_INFORMATION',
    label: 'Mismatched Information',
    text: 'The document details do not match the application information.',
  },
] as const;

type RequestInfoReasonTemplateId = (typeof requestInfoReasonTemplates)[number]['id'];
type DocumentRejectReasonTemplateId = (typeof documentRejectReasonTemplates)[number]['id'];

const requestInfoTemplateIdSchema = z.enum(requestInfoReasonTemplates.map((item) => item.id) as [RequestInfoReasonTemplateId, ...RequestInfoReasonTemplateId[]]);
const documentRejectTemplateIdSchema = z.enum(documentRejectReasonTemplates.map((item) => item.id) as [DocumentRejectReasonTemplateId, ...DocumentRejectReasonTemplateId[]]);

const requestInfoSchema = z
  .object({
    templateId: requestInfoTemplateIdSchema.optional(),
    note: sanitizedTextSchema(1000).optional(),
  })
  .refine((value) => Boolean(value.templateId || value.note), {
    message: 'Either templateId or note is required',
    path: ['templateId'],
  });

const addNoteSchema = z.object({
  content: sanitizedTextSchema(2000),
  isInternal: z.boolean().optional(),
});

const rejectDocumentSchema = z
  .object({
    templateId: documentRejectTemplateIdSchema.optional(),
    reason: sanitizedTextSchema(1000).optional(),
  })
  .refine((value) => Boolean(value.templateId || value.reason), {
    message: 'Either templateId or reason is required',
    path: ['templateId'],
  });

const bulkDocumentStatusSchema = z
  .object({
    documentIds: z.array(z.string().uuid()).min(1).max(100),
    status: z.enum(['VERIFIED', 'REJECTED']),
    reason: sanitizedTextSchema(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'REJECTED' && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'reason is required when rejecting documents',
        path: ['reason'],
      });
    }
  });

const formatValidationErrors = (issues: z.ZodIssue[]) =>
  issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));

const statusTransitionMap: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'PENDING_DOCUMENTS', 'REJECTED'],
  UNDER_REVIEW: ['KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED'],
  KYC_VERIFICATION: ['UNDER_REVIEW', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED'],
  PENDING_DOCUMENTS: ['UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_CLARIFICATION', 'REJECTED'],
  PENDING_CLARIFICATION: ['UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'REJECTED'],
  APPROVED: ['ACTIVATED'],
  REJECTED: [],
  ACTIVATED: ['APPROVED'],
};

const isValidStatus = (status: string) => Object.prototype.hasOwnProperty.call(statusTransitionMap, status);
const canTransition = (fromStatus: string, toStatus: string) =>
  statusTransitionMap[fromStatus]?.includes(toStatus) ?? false;

const isValidApplicationType = (value: string): value is ApplicationType => value === 'membership' || value === 'loan';

const paramToString = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

const isUuidLike = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isSuperAdmin = (req: AuthRequest) => req.user?.role === 'SUPER_ADMIN';

const getScopedBranchId = (req: AuthRequest): string | null => {
  if (isSuperAdmin(req)) {
    return null;
  }
  return req.user?.branchId || null;
};

const toBranchScopeKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\b(head office|branch|hq)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getScopedBranchIds = async (req: AuthRequest, scopedBranchId: string | null): Promise<string[] | null> => {
  if (isSuperAdmin(req)) {
    return null;
  }

  if (!scopedBranchId) {
    return [];
  }

  // Branch managers may operate across branch naming variants for the same locality
  // (e.g., "Mekelle Branch" and "Mekelle Head Office").
  if (req.user?.role !== 'BRANCH_MANAGER') {
    return [scopedBranchId];
  }

  const branches = await prisma.branch.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const currentBranch = branches.find((branch) => branch.id === scopedBranchId);
  if (!currentBranch) {
    return [scopedBranchId];
  }

  const scopeKey = toBranchScopeKey(currentBranch.name);
  if (!scopeKey) {
    return [scopedBranchId];
  }

  const scopedBranchIds = branches
    .filter((branch) => toBranchScopeKey(branch.name) === scopeKey)
    .map((branch) => branch.id);

  return scopedBranchIds.length > 0 ? scopedBranchIds : [scopedBranchId];
};

const parsePageLimit = (pageValue: unknown, limitValue: unknown) => {
  const page = Math.max(1, parseInt(String(pageValue || '1'), 10));
  const limit = Math.max(1, Math.min(100, parseInt(String(limitValue || '25'), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const statusSlaHours: Partial<Record<(typeof applicationStatusValues)[number], number>> = {
  SUBMITTED: 24,
  UNDER_REVIEW: 48,
  KYC_VERIFICATION: 48,
  PENDING_DOCUMENTS: 72,
  PENDING_CLARIFICATION: 72,
};

const escalationRules = [
  {
    level: 'L1',
    thresholdHours: 72,
    action: 'Notify Branch Manager',
  },
  {
    level: 'L2',
    thresholdHours: 120,
    action: 'Escalate to Super Admin',
  },
  {
    level: 'L3',
    thresholdHours: 168,
    action: 'Trigger urgent operations follow-up',
  },
] as const;

const toHours = (ms: number): number => Math.max(0, Math.round((ms / (1000 * 60 * 60)) * 10) / 10);

const getAgeBucket = (ageHours: number): 'fresh' | 'aging' | 'stale' => {
  if (ageHours < 24) return 'fresh';
  if (ageHours < 72) return 'aging';
  return 'stale';
};

const getEscalationForAge = (ageHours: number) => {
  const matchedRule = [...escalationRules].reverse().find((rule) => ageHours >= rule.thresholdHours);
  if (!matchedRule) {
    return {
      escalated: false,
      level: null,
      action: null,
      thresholdHours: null,
    };
  }

  return {
    escalated: true,
    level: matchedRule.level,
    action: matchedRule.action,
    thresholdHours: matchedRule.thresholdHours,
  };
};

const buildQueueMetrics = (status: string, startedAt: Date | null | undefined) => {
  if (!startedAt) {
    return {
      ageHours: 0,
      ageBucket: 'fresh',
      slaHours: null,
      slaBreached: false,
      slaRemainingHours: null,
      escalation: {
        escalated: false,
        level: null,
        action: null,
        thresholdHours: null,
      },
    };
  }

  const ageHours = toHours(Date.now() - startedAt.getTime());
  const typedStatus = status as (typeof applicationStatusValues)[number];
  const configuredSla = statusSlaHours[typedStatus];
  const slaRemainingHours = typeof configuredSla === 'number' ? Math.round((configuredSla - ageHours) * 10) / 10 : null;
  const escalation = getEscalationForAge(ageHours);

  return {
    ageHours,
    ageBucket: getAgeBucket(ageHours),
    slaHours: configuredSla ?? null,
    slaBreached: typeof configuredSla === 'number' ? ageHours > configuredSla : false,
    slaRemainingHours,
    escalation,
  };
};

const buildTemplatedReason = (params: {
  templates: ReadonlyArray<{ id: string; text: string }>;
  templateId?: string;
  customText?: string;
  fallbackText: string;
}): string => {
  const fromTemplate = params.templateId
    ? params.templates.find((template) => template.id === params.templateId)?.text
    : '';

  const normalizedCustomText = params.customText?.trim() || '';

  if (fromTemplate && normalizedCustomText) {
    return `${fromTemplate} Additional details: ${normalizedCustomText}`;
  }

  if (fromTemplate) {
    return fromTemplate;
  }

  if (normalizedCustomText) {
    return normalizedCustomText;
  }

  return params.fallbackText;
};

const getClientIp = (req: AuthRequest): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]);
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const getApplicationTargetType = (applicationType: ApplicationType): string =>
  applicationType === 'membership' ? 'MEMBERSHIP_APPLICATION' : 'LOAN_APPLICATION';

const buildApplicantName = (firstName: string, middleName?: string | null, lastName?: string | null): string =>
  [firstName, middleName || '', lastName || ''].map((part) => part.trim()).filter(Boolean).join(' ');

async function logHighRiskAction(params: {
  req: AuthRequest;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
}): Promise<void> {
  if (!params.req.user) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      userId: params.req.user.id,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: JSON.stringify(params.details),
      ipAddress: getClientIp(params.req),
    },
  });
}

// GET /api/admin/security/abuse-monitor
router.get('/security/abuse-monitor', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const metrics = await getSecurityAbuseMetrics();
    res.json({
      asOf: new Date().toISOString(),
      ...metrics,
    });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      sendPreparedStatementFallback(res, {
        asOf: new Date().toISOString(),
        summary: { lastHour: 0, last24Hours: 0 },
        endpointMetrics: [
          { endpoint: 'login', label: 'Login', lastHour: 0, last24Hours: 0 },
          { endpoint: 'upload', label: 'Upload', lastHour: 0, last24Hours: 0 },
          { endpoint: 'public-inquiry', label: 'Public inquiry', lastHour: 0, last24Hours: 0 },
        ],
        recentEvents: [],
      });
      return;
    }

    console.error('Get abuse monitor metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/workflow/reason-templates
router.get('/workflow/reason-templates', authenticate, authorize(...reviewerRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    requestInfo: requestInfoReasonTemplates,
    documentReject: documentRejectReasonTemplates,
  });
});

// GET /api/admin/workflow/stale-escalations
router.get('/workflow/stale-escalations', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scopedBranchId = getScopedBranchId(req);

    if (!isSuperAdmin(req) && !scopedBranchId) {
      res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
      return;
    }

    const baseWhere: Record<string, unknown> = {
      status: { notIn: ['APPROVED', 'ACTIVATED', 'REJECTED', 'DRAFT'] },
    };

    if (!isSuperAdmin(req)) {
      baseWhere.branchId = scopedBranchId;
    }

    const [membershipRows, loanRows] = await Promise.all([
      prisma.membershipApplication.findMany({
        where: baseWhere,
        include: {
          applicant: { select: { firstName: true, middleName: true, lastName: true } },
          branch: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 250,
      }),
      prisma.loanApplication.findMany({
        where: baseWhere,
        include: {
          applicant: { select: { firstName: true, middleName: true, lastName: true } },
          branch: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 250,
      }),
    ]);

    const toEscalationRow = (
      item: {
        id: string;
        referenceNo: string;
        status: string;
        submittedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        applicant: { firstName: string; middleName: string | null; lastName: string };
        branch: { id: string; name: string; code: string } | null;
        assignedTo: { id: string; name: string } | null;
      },
      applicationType: ApplicationType
    ) => {
      const metrics = buildQueueMetrics(item.status, item.submittedAt || item.createdAt);
      return {
        applicationType,
        id: item.id,
        referenceNo: item.referenceNo,
        status: item.status,
        applicantName: [item.applicant.firstName, item.applicant.middleName, item.applicant.lastName].filter(Boolean).join(' '),
        branch: item.branch,
        assignedTo: item.assignedTo,
        updatedAt: item.updatedAt,
        queueMetrics: metrics,
      };
    };

    const escalations = [
      ...membershipRows.map((item) => toEscalationRow(item, 'membership')),
      ...loanRows.map((item) => toEscalationRow(item, 'loan')),
    ]
      .filter((item) => item.queueMetrics.escalation.escalated)
      .sort((a, b) => b.queueMetrics.ageHours - a.queueMetrics.ageHours);

    res.json({
      escalationRules,
      total: escalations.length,
      escalations,
    });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      sendPreparedStatementFallback(res, {
        escalationRules,
        total: 0,
        escalations: [],
      });
      return;
    }

    console.error('Get stale escalations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/assignees
router.get('/assignees', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branchId, applicationType } = req.query;
    const scopedBranchId = getScopedBranchId(req);

    if (!isSuperAdmin(req) && !scopedBranchId) {
      res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
      return;
    }

    const where: Record<string, unknown> = {
      isActive: true,
      role: {
        in: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'MEMBERSHIP_OFFICER', 'LOAN_OFFICER', 'KYC_OFFICER'],
      },
    };

    if (isSuperAdmin(req)) {
      if (branchId) {
        where.branchId = branchId;
      }
    } else {
      where.branchId = scopedBranchId;
    }

    if (applicationType === 'membership') {
      where.role = {
        in: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'MEMBERSHIP_OFFICER', 'KYC_OFFICER'],
      };
    }

    if (applicationType === 'loan') {
      where.role = {
        in: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'LOAN_OFFICER', 'KYC_OFFICER'],
      };
    }

    const users = await prisma.adminUser.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ users });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      sendPreparedStatementFallback(res, { users: [] });
      return;
    }

    console.error('List assignees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function ensureExists(applicationType: ApplicationType, id: string) {
  if (applicationType === 'membership') {
    return prisma.membershipApplication.findUnique({ where: { id } });
  }
  return prisma.loanApplication.findUnique({ where: { id } });
}

// GET /api/admin/queues/membership
router.get('/queues/membership', authenticate, authorize(...reviewerRoles), authorizeModule('membership'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, branchId, assignedToId, search, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { page: parsedPage, limit: parsedLimit, skip } = parsePageLimit(page, limit);
    const scopedBranchId = getScopedBranchId(req);
    const scopedBranchIds = await getScopedBranchIds(req, scopedBranchId);

    if (!isSuperAdmin(req) && (!scopedBranchIds || scopedBranchIds.length === 0)) {
      res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
      return;
    }

    const where: Record<string, unknown> = {};
    if (status) {
      const statusString = String(status).trim();
      if (statusString.includes(',')) {
        where.status = {
          in: statusString.split(',').map(s => s.trim())
        };
      } else {
        where.status = statusString;
      }
    } else {
      where.status = { notIn: ['APPROVED', 'ACTIVATED'] };
    }
    if (isSuperAdmin(req)) {
      if (branchId) {
        const branchToken = String(branchId);
        if (isUuidLike(branchToken)) {
          where.branchId = branchToken;
        } else {
          where.branch = { name: { equals: branchToken } };
        }
      }
    } else {
      where.branchId = scopedBranchIds!.length === 1
        ? scopedBranchIds![0]
        : { in: scopedBranchIds };
    }
    if (assignedToId) {
      const assigneeToken = String(assignedToId);
      if (isUuidLike(assigneeToken)) {
        where.assignedToId = assigneeToken;
      } else {
        where.assignedTo = { name: { equals: assigneeToken } };
      }
    }
    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { referenceNo: { contains: normalizedSearch } },
        {
          applicant: {
            OR: [
              { firstName: { contains: normalizedSearch } },
              { middleName: { contains: normalizedSearch } },
              { lastName: { contains: normalizedSearch } },
              { phone: { contains: normalizedSearch } },
            ],
          },
        },
      ];
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'submittedAt', 'status', 'referenceNo'] as const;
    const orderField = allowedSortFields.includes(String(sortBy) as (typeof allowedSortFields)[number])
      ? (String(sortBy) as (typeof allowedSortFields)[number])
      : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [applications, total] = await Promise.all([
      prisma.membershipApplication.findMany({
        where,
        include: {
          applicant: true,
          branch: true,
          assignedTo: { select: { id: true, name: true } },
          documents: { select: { id: true, category: true, status: true } },
        },
        orderBy: { [orderField]: orderDirection },
        skip,
        take: parsedLimit,
      }),
      prisma.membershipApplication.count({ where }),
    ]);

    res.json({
      applications: applications.map((application) => ({
        ...application,
        queueMetrics: buildQueueMetrics(application.status, application.submittedAt || application.createdAt),
      })),
      total,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
      },
    });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      const { page: fallbackPage, limit: fallbackLimit } = parsePageLimit(req.query.page, req.query.limit);
      sendPreparedStatementFallback(res, {
        applications: [],
        total: 0,
        pagination: {
          total: 0,
          page: fallbackPage,
          limit: fallbackLimit,
          totalPages: 1,
        },
      });
      return;
    }

    console.error('Membership queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/queues/loan
router.get('/queues/loan', authenticate, authorize(...reviewerRoles), authorizeModule('loan'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, branchId, assignedToId, loanType, search, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { page: parsedPage, limit: parsedLimit, skip } = parsePageLimit(page, limit);
    const scopedBranchId = getScopedBranchId(req);
    const scopedBranchIds = await getScopedBranchIds(req, scopedBranchId);

    if (!isSuperAdmin(req) && (!scopedBranchIds || scopedBranchIds.length === 0)) {
      res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
      return;
    }

    const where: Record<string, unknown> = {};
    if (status) {
      const statusString = String(status).trim();
      if (statusString.includes(',')) {
        where.status = {
          in: statusString.split(',').map(s => s.trim())
        };
      } else {
        where.status = statusString;
      }
    } else {
      where.status = { notIn: ['APPROVED', 'ACTIVATED'] };
    }
    if (isSuperAdmin(req)) {
      if (branchId) {
        const branchToken = String(branchId);
        if (isUuidLike(branchToken)) {
          where.branchId = branchToken;
        } else {
          where.branch = { name: { equals: branchToken } };
        }
      }
    } else {
      where.branchId = scopedBranchIds!.length === 1
        ? scopedBranchIds![0]
        : { in: scopedBranchIds };
    }
    if (assignedToId) {
      const assigneeToken = String(assignedToId);
      if (isUuidLike(assigneeToken)) {
        where.assignedToId = assigneeToken;
      } else {
        where.assignedTo = { name: { equals: assigneeToken } };
      }
    }
    if (loanType) where.loanType = loanType;
    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { referenceNo: { contains: normalizedSearch } },
        { membershipNo: { contains: normalizedSearch } },
        {
          applicant: {
            OR: [
              { firstName: { contains: normalizedSearch } },
              { middleName: { contains: normalizedSearch } },
              { lastName: { contains: normalizedSearch } },
              { phone: { contains: normalizedSearch } },
            ],
          },
        },
      ];
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'submittedAt', 'status', 'referenceNo', 'amount', 'loanType'] as const;
    const orderField = allowedSortFields.includes(String(sortBy) as (typeof allowedSortFields)[number])
      ? (String(sortBy) as (typeof allowedSortFields)[number])
      : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [applications, total] = await Promise.all([
      prisma.loanApplication.findMany({
        where,
        include: {
          applicant: true,
          branch: true,
          assignedTo: { select: { id: true, name: true } },
          documents: { select: { id: true, category: true, status: true } },
        },
        orderBy: { [orderField]: orderDirection },
        skip,
        take: parsedLimit,
      }),
      prisma.loanApplication.count({ where }),
    ]);

    res.json({
      applications: applications.map((application) => ({
        ...application,
        queueMetrics: buildQueueMetrics(application.status, application.submittedAt || application.createdAt),
      })),
      total,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
      },
    });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      const { page: fallbackPage, limit: fallbackLimit } = parsePageLimit(req.query.page, req.query.limit);
      sendPreparedStatementFallback(res, {
        applications: [],
        total: 0,
        pagination: {
          total: 0,
          page: fallbackPage,
          limit: fallbackLimit,
          totalPages: 1,
        },
      });
      return;
    }

    console.error('Loan queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/applications/:applicationType/:id
router.get('/applications/:applicationType/:id', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    if (!isValidApplicationType(applicationType)) {
      res.status(400).json({ error: 'applicationType must be membership or loan' });
      return;
    }

    const application =
      applicationType === 'membership'
        ? await prisma.membershipApplication.findUnique({
          where: { id },
          include: {
            applicant: true,
            branch: true,
            assignedTo: { select: { id: true, name: true, role: true } },
            documents: true,
            notes: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
            workflow: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
          },
        })
        : await prisma.loanApplication.findUnique({
          where: { id },
          include: {
            applicant: true,
            branch: true,
            assignedTo: { select: { id: true, name: true, role: true } },
            documents: true,
            notes: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
            workflow: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
          },
        });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }
      if (application.branchId !== scopedBranchId) {
        res.status(403).json({ error: 'You are not allowed to access this application' });
        return;
      }
    }

    res.json({ applicationType, application });
  } catch (error) {
    console.error('Get admin application detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/applications/:applicationType/:id/assign
router.patch('/applications/:applicationType/:id/assign', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), idempotency(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    const parsedBody = assignSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: formatValidationErrors(parsedBody.error.issues),
      });
      return;
    }

    const { assignedToId, expectedUpdatedAt } = parsedBody.data;

    if (!isValidApplicationType(applicationType)) {
      res.status(400).json({ error: 'applicationType must be membership or loan' });
      return;
    }

    const existing = await ensureExists(applicationType, id);
    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }
      if (existing.branchId !== scopedBranchId) {
        res.status(403).json({ error: 'You are not allowed to update this application' });
        return;
      }
    }

    const optimisticWhere = {
      id,
      updatedAt: new Date(expectedUpdatedAt),
    };

    const updatedCount =
      applicationType === 'membership'
        ? await prisma.membershipApplication.updateMany({
          where: optimisticWhere,
          data: { assignedToId: assignedToId || null },
        })
        : await prisma.loanApplication.updateMany({
          where: optimisticWhere,
          data: { assignedToId: assignedToId || null },
        });

    if (updatedCount.count === 0) {
      const latest = await ensureExists(applicationType, id);
      res.status(409).json({
        error: 'Application was modified by another user. Refresh and retry.',
        currentUpdatedAt: latest?.updatedAt || null,
      });
      return;
    }

    const application =
      applicationType === 'membership'
        ? await prisma.membershipApplication.findUnique({
          where: { id },
          include: { assignedTo: { select: { id: true, name: true, role: true } } },
        })
        : await prisma.loanApplication.findUnique({
          where: { id },
          include: { assignedTo: { select: { id: true, name: true, role: true } } },
        });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    await logHighRiskAction({
      req,
      action: 'APPLICATION_ASSIGNMENT_UPDATED',
      targetType: getApplicationTargetType(applicationType),
      targetId: id,
      details: {
        previousAssignedToId: existing.assignedToId || null,
        nextAssignedToId: assignedToId || null,
      },
    });

    res.json({ application });
  } catch (error) {
    console.error('Assign application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/applications/:applicationType/:id/status
router.patch('/applications/:applicationType/:id/status', authenticate, authorize(...reviewerRoles), idempotency(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    const parsedBody = updateStatusSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: formatValidationErrors(parsedBody.error.issues),
      });
      return;
    }

    const { status, note, expectedUpdatedAt } = parsedBody.data;

    if (!isValidApplicationType(applicationType)) {
      res.status(400).json({ error: 'applicationType must be membership or loan' });
      return;
    }

    if (!isValidStatus(status)) {
      res.status(400).json({ error: 'Invalid status value' });
      return;
    }

    const existing = await ensureExists(applicationType, id);
    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }
      if (existing.branchId !== scopedBranchId) {
        res.status(403).json({ error: 'You are not allowed to update this application' });
        return;
      }
    }

    if (!canTransition(existing.status, status)) {
      res.status(400).json({
        error: `Invalid transition from ${existing.status} to ${status}`,
        allowedNextStatuses: statusTransitionMap[existing.status] || [],
      });
      return;
    }

    const reviewedAt = ['APPROVED', 'REJECTED'].includes(status) ? new Date() : undefined;

    const optimisticWhere = {
      id,
      updatedAt: new Date(expectedUpdatedAt),
    };

    const updatedCount =
      applicationType === 'membership'
        ? await prisma.membershipApplication.updateMany({
          where: optimisticWhere,
          data: {
            status,
            reviewedAt,
          },
        })
        : await prisma.loanApplication.updateMany({
          where: optimisticWhere,
          data: {
            status,
            reviewedAt,
          },
        });

    if (updatedCount.count === 0) {
      const latest = await ensureExists(applicationType, id);
      res.status(409).json({
        error: 'Application was modified by another user. Refresh and retry.',
        currentUpdatedAt: latest?.updatedAt || null,
      });
      return;
    }

    await prisma.workflowHistory.create({
      data: {
        fromStatus: existing.status,
        toStatus: status,
        note,
        changedById: req.user!.id,
        membershipApplicationId: applicationType === 'membership' ? id : undefined,
        loanApplicationId: applicationType === 'loan' ? id : undefined,
      },
    });

    const application =
      applicationType === 'membership'
        ? await prisma.membershipApplication.findUnique({ where: { id }, include: { applicant: true } })
        : await prisma.loanApplication.findUnique({ where: { id }, include: { applicant: true } });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    await logHighRiskAction({
      req,
      action: 'APPLICATION_STATUS_UPDATED',
      targetType: getApplicationTargetType(applicationType),
      targetId: id,
      details: {
        fromStatus: existing.status,
        toStatus: status,
        note: note || null,
      },
    });

    if (status === 'APPROVED' && application.applicant.email) {
      const applicantName = buildApplicantName(
        application.applicant.firstName,
        application.applicant.middleName,
        application.applicant.lastName
      );
      const approvedMessage = applicationType === 'membership'
        ? buildMembershipApprovedTemplate(applicantName)
        : buildLoanApprovedTemplate(applicantName);

      void sendNotification({
        to: application.applicant.email,
        channel: 'EMAIL',
        subject: approvedMessage.subject,
        message: approvedMessage.message,
      });
    }

    res.json({ application });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/applications/:applicationType/:id/request-info
router.post('/applications/:applicationType/:id/request-info', authenticate, authorize(...reviewerRoles), idempotency(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    const parsedBody = requestInfoSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: formatValidationErrors(parsedBody.error.issues),
      });
      return;
    }

    const { templateId, note } = parsedBody.data;

    if (!isValidApplicationType(applicationType)) {
      res.status(400).json({ error: 'applicationType must be membership or loan' });
      return;
    }

    const existing = await ensureExists(applicationType, id);
    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }
      if (existing.branchId !== scopedBranchId) {
        res.status(403).json({ error: 'You are not allowed to update this application' });
        return;
      }
    }

    const status = 'PENDING_DOCUMENTS';

    if (!canTransition(existing.status, status)) {
      res.status(400).json({
        error: `Invalid transition from ${existing.status} to ${status}`,
        allowedNextStatuses: statusTransitionMap[existing.status] || [],
      });
      return;
    }

    const application =
      applicationType === 'membership'
        ? await prisma.membershipApplication.update({ where: { id }, data: { status } })
        : await prisma.loanApplication.update({ where: { id }, data: { status } });

    const requestReason = buildTemplatedReason({
      templates: requestInfoReasonTemplates,
      templateId,
      customText: note,
      fallbackText: 'Requested additional documents/information',
    });

    await prisma.workflowHistory.create({
      data: {
        fromStatus: existing.status,
        toStatus: status,
        note: requestReason,
        changedById: req.user!.id,
        membershipApplicationId: applicationType === 'membership' ? id : undefined,
        loanApplicationId: applicationType === 'loan' ? id : undefined,
      },
    });

    if (requestReason) {
      await prisma.applicationNote.create({
        data: {
          content: requestReason,
          isInternal: true,
          authorId: req.user!.id,
          membershipApplicationId: applicationType === 'membership' ? id : undefined,
          loanApplicationId: applicationType === 'loan' ? id : undefined,
        },
      });
    }

    await logHighRiskAction({
      req,
      action: 'APPLICATION_INFO_REQUESTED',
      targetType: getApplicationTargetType(applicationType),
      targetId: id,
      details: {
        fromStatus: existing.status,
        toStatus: status,
        note: requestReason,
        templateId: templateId || null,
      },
    });

    res.json({ application });
  } catch (error) {
    console.error('Request info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/applications/:applicationType/:id/notes
router.post('/applications/:applicationType/:id/notes', authenticate, authorize(...reviewerRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    const parsedBody = addNoteSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: formatValidationErrors(parsedBody.error.issues),
      });
      return;
    }

    const { content, isInternal = true } = parsedBody.data;

    if (!isValidApplicationType(applicationType)) {
      res.status(400).json({ error: 'applicationType must be membership or loan' });
      return;
    }

    const existing = await ensureExists(applicationType, id);
    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }
      if (existing.branchId !== scopedBranchId) {
        res.status(403).json({ error: 'You are not allowed to add notes to this application' });
        return;
      }
    }

    const note = await prisma.applicationNote.create({
      data: {
        content,
        isInternal,
        authorId: req.user!.id,
        membershipApplicationId: applicationType === 'membership' ? id : undefined,
        loanApplicationId: applicationType === 'loan' ? id : undefined,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(201).json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/documents/review
router.get('/documents/review', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status = 'PENDING', category, page = '1', limit = '25' } = req.query;
    const { page: parsedPage, limit: parsedLimit, skip } = parsePageLimit(page, limit);
    const scopedBranchId = getScopedBranchId(req);

    if (!isSuperAdmin(req) && !scopedBranchId) {
      res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
      return;
    }

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }

    if (!isSuperAdmin(req) && scopedBranchId) {
      where.OR = [
        { membershipApplication: { is: { branchId: scopedBranchId } } },
        { loanApplication: { is: { branchId: scopedBranchId } } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          membershipApplication: {
            select: {
              id: true,
              referenceNo: true,
              applicant: { select: { firstName: true, middleName: true, lastName: true } },
            },
          },
          loanApplication: {
            select: {
              id: true,
              referenceNo: true,
              applicant: { select: { firstName: true, middleName: true, lastName: true } },
            },
          },
          verifiedBy: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: parsedLimit,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      documents,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      const { page: fallbackPage, limit: fallbackLimit } = parsePageLimit(req.query.page, req.query.limit);
      sendPreparedStatementFallback(res, {
        documents: [],
        pagination: {
          total: 0,
          page: fallbackPage,
          limit: fallbackLimit,
          totalPages: 1,
        },
      });
      return;
    }

    console.error('Document review list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/documents/:id/verify
router.patch('/documents/:id/verify', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), idempotency(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }

      const scopedDocument = await prisma.document.findFirst({
        where: {
          id,
          OR: [
            { membershipApplication: { is: { branchId: scopedBranchId } } },
            { loanApplication: { is: { branchId: scopedBranchId } } },
          ],
        },
      });

      if (!scopedDocument) {
        res.status(403).json({ error: 'You are not allowed to update this document' });
        return;
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: req.user!.id,
        rejectionReason: null,
      },
    });

    await logHighRiskAction({
      req,
      action: 'DOCUMENT_VERIFIED',
      targetType: 'DOCUMENT',
      targetId: id,
      details: {
        previousStatus: existing.status,
        nextStatus: 'VERIFIED',
      },
    });

    res.json({ document });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/documents/:id/reject
router.patch('/documents/:id/reject', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), idempotency(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);

    const parsedBody = rejectDocumentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: formatValidationErrors(parsedBody.error.issues),
      });
      return;
    }

    const { templateId, reason } = parsedBody.data;

    const rejectionReason = buildTemplatedReason({
      templates: documentRejectReasonTemplates,
      templateId,
      customText: reason,
      fallbackText: 'Document rejected',
    });

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }

      const scopedDocument = await prisma.document.findFirst({
        where: {
          id,
          OR: [
            { membershipApplication: { is: { branchId: scopedBranchId } } },
            { loanApplication: { is: { branchId: scopedBranchId } } },
          ],
        },
      });

      if (!scopedDocument) {
        res.status(403).json({ error: 'You are not allowed to update this document' });
        return;
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        status: 'REJECTED',
        verifiedAt: new Date(),
        verifiedById: req.user!.id,
        rejectionReason,
      },
    });

    await logHighRiskAction({
      req,
      action: 'DOCUMENT_REJECTED',
      targetType: 'DOCUMENT',
      targetId: id,
      details: {
        previousStatus: existing.status,
        nextStatus: 'REJECTED',
        reason: rejectionReason,
        templateId: templateId || null,
      },
    });

    res.json({ document });
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/documents/bulk-status
router.patch('/documents/bulk-status', authenticate, authorize(...reviewerRoles), authorizeModule('dashboard'), idempotency(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsedBody = bulkDocumentStatusSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: formatValidationErrors(parsedBody.error.issues),
      });
      return;
    }

    const { documentIds, status, reason } = parsedBody.data;

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req) && !scopedBranchId) {
      res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
      return;
    }

    const where: Record<string, unknown> = {
      id: { in: documentIds },
    };

    if (!isSuperAdmin(req) && scopedBranchId) {
      where.OR = [
        { membershipApplication: { is: { branchId: scopedBranchId } } },
        { loanApplication: { is: { branchId: scopedBranchId } } },
      ];
    }

    const result = await prisma.document.updateMany({
      where,
      data: {
        status,
        verifiedAt: new Date(),
        verifiedById: req.user!.id,
        rejectionReason: status === 'REJECTED' ? reason! : null,
      },
    });

    await logHighRiskAction({
      req,
      action: 'DOCUMENT_BULK_STATUS_UPDATED',
      targetType: 'DOCUMENT_BATCH',
      targetId: null,
      details: {
        documentIds,
        status,
        reason: reason || null,
        updatedCount: result.count,
      },
    });

    res.json({ updatedCount: result.count });
  } catch (error) {
    console.error('Bulk document status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/applications/:applicationType/:id
router.delete('/applications/:applicationType/:id', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    if (!isValidApplicationType(applicationType)) {
      res.status(400).json({ error: 'applicationType must be membership or loan' });
      return;
    }

    const existing = await ensureExists(applicationType, id);
    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const scopedBranchId = getScopedBranchId(req);
    if (!isSuperAdmin(req)) {
      if (!scopedBranchId) {
        res.status(403).json({ error: 'Branch-scoped access requires a user branch assignment' });
        return;
      }
      if (existing.branchId !== scopedBranchId) {
        res.status(403).json({ error: 'You are not allowed to delete this application' });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      if (applicationType === 'membership') {
        await tx.document.deleteMany({ where: { membershipApplicationId: id } });
        await tx.applicationNote.deleteMany({ where: { membershipApplicationId: id } });
        await tx.workflowHistory.deleteMany({ where: { membershipApplicationId: id } });
        await tx.membershipApplication.delete({ where: { id } });
      } else {
        await tx.document.deleteMany({ where: { loanApplicationId: id } });
        await tx.applicationNote.deleteMany({ where: { loanApplicationId: id } });
        await tx.workflowHistory.deleteMany({ where: { loanApplicationId: id } });
        await tx.loanApplication.delete({ where: { id } });
      }
    });

    await logHighRiskAction({
      req,
      action: 'APPLICATION_DELETED',
      targetType: getApplicationTargetType(applicationType),
      targetId: id,
      details: {
        deletedByRole: req.user?.role || null,
      },
    });

    res.json({ deleted: true, applicationType, id });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
