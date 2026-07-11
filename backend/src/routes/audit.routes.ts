import { Router, Response } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { authenticate, authorize, authorizeModule, AuthRequest } from '../middleware/auth';
import { verifyAuditIntegrity } from '../services/audit-integrity.service';
import { z } from 'zod';
import { enforceSensitiveDataAccess, hasSensitiveDataAccess, maskEmail, maskIpAddress } from '../utils/data-access-policy';
import { captureOperationalAlert } from '../services/operational-alert.service';
import { enqueueBackgroundJob } from '../services/background-job-queue.service';
import { readFeatureFlags } from '../services/feature-flag.service';

const router = Router();

const AUDIT_RETENTION_DAYS = Math.max(30, Number.parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555', 10) || 2555);
const AUDIT_EXPORT_MAX_ROWS = Math.max(100, Math.min(10000, Number.parseInt(process.env.AUDIT_EXPORT_MAX_ROWS || '5000', 10) || 5000));

const AUDIT_EXPORT_SIGNING_SECRET = process.env.AUDIT_EXPORT_SIGNING_SECRET || process.env.JWT_SECRET || 'audit-export-secret';
let exportAuditTableEnsured = false;

const isMySqlDatabase = (): boolean => {
  const url = (process.env.DATABASE_URL || '').toLowerCase();
  return url.startsWith('mysql://') || url.startsWith('mysqls://');
};

const auditExportQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().trim().min(1).max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  format: z.enum(['csv', 'json']).optional(),
  limit: z.coerce.number().int().min(1).max(AUDIT_EXPORT_MAX_ROWS).optional(),
});

const formatCsvValue = (value: unknown): string => {
  const normalized = String(value ?? '');
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildAuditWhereClause = (query: {
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}): Record<string, unknown> => {
  const where: Record<string, unknown> = {};

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.from || query.to) {
    where.createdAt = {
      gte: query.from ? new Date(query.from) : undefined,
      lte: query.to ? new Date(query.to) : undefined,
    };
  }

  return where;
};

const ensureExportAuditTable = async (): Promise<void> => {
  if (exportAuditTableEnsured) {
    return;
  }

  if (isMySqlDatabase()) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS export_audit_records (
        id CHAR(36) PRIMARY KEY,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        requestedBy VARCHAR(191) NOT NULL,
        requestId VARCHAR(191) NULL,
        format VARCHAR(16) NOT NULL,
        rows INT NOT NULL,
        digest VARCHAR(191) NOT NULL,
        signature VARCHAR(191) NOT NULL,
        filters JSON NOT NULL,
        INDEX export_audit_records_created_at_idx (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS export_audit_records (
        id UUID PRIMARY KEY,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "requestedBy" TEXT NOT NULL,
        "requestId" TEXT,
        format TEXT NOT NULL,
        rows INTEGER NOT NULL,
        digest TEXT NOT NULL,
        signature TEXT NOT NULL,
        filters JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS export_audit_records_created_at_idx ON export_audit_records ("createdAt")'
    );
  }

  exportAuditTableEnsured = true;
};

const signExportPayload = (payload: string): { digest: string; signature: string } => {
  const digest = crypto.createHash('sha256').update(payload).digest('hex');
  const signature = crypto.createHmac('sha256', AUDIT_EXPORT_SIGNING_SECRET).update(digest).digest('hex');
  return { digest, signature };
};

router.get('/policy', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), authorizeModule('audit-log'), async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    immutable: true,
    retention: {
      days: AUDIT_RETENTION_DAYS,
      note: 'Audit records are append-only and must not be edited or deleted through API workflows.',
    },
    export: {
      formats: ['csv', 'json'],
      maxRowsPerRequest: AUDIT_EXPORT_MAX_ROWS,
    },
  });
});

router.get('/', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), authorizeModule('audit-log'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, action, from, to, page = '1', limit = '25', cursor, includeSensitive = 'false' } = req.query;
    const requestLimit = Math.max(1, Math.min(200, parseInt(String(limit), 10) || 25));
    const isCursorMode = typeof cursor === 'string' && cursor.length > 0;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    if (from || to) {
      where.createdAt = {
        gte: from ? new Date(String(from)) : undefined,
        lte: to ? new Date(String(to)) : undefined,
      };
    }

    const skip = (parseInt(String(page), 10) - 1) * requestLimit;

    const needsSensitiveData = String(includeSensitive).toLowerCase() === 'true';
    if (needsSensitiveData) {
      const allowed = await enforceSensitiveDataAccess(req, res, 'audit-log includeSensitive');
      if (!allowed) {
        return;
      }
    }

    const events = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(isCursorMode
        ? {
            cursor: { id: String(cursor) },
            skip: 1,
            take: requestLimit,
          }
        : {
            skip,
            take: requestLimit,
          }),
    });

    const [total, activeAdmins] = await Promise.all([
      isCursorMode ? Promise.resolve(0) : prisma.auditLog.count({ where }),
      prisma.adminUser.count({ where: { isActive: true } }),
    ]);

    const isSensitiveViewer = hasSensitiveDataAccess(req);
    const responseEvents = events.map((event) => ({
      ...event,
      user: {
        ...event.user,
        email: needsSensitiveData && isSensitiveViewer ? event.user.email : maskEmail(event.user.email),
      },
      ipAddress: needsSensitiveData && isSensitiveViewer ? event.ipAddress : maskIpAddress(event.ipAddress),
    }));

    const nextCursor = responseEvents.length === requestLimit ? responseEvents[responseEvents.length - 1].id : null;

    res.json({
      kpi: {
        totalSecurityEvents: isCursorMode ? null : total,
        activeAdmins,
        anomaliesDetected: 0,
      },
      events: responseEvents,
      pagination: {
        total: isCursorMode ? null : total,
        page: parseInt(String(page), 10),
        limit: requestLimit,
        mode: isCursorMode ? 'cursor' : 'offset',
        nextCursor,
      },
    });
  } catch (error) {
    void captureOperationalAlert({
      severity: 'WARNING',
      source: 'audit.list',
      message: error instanceof Error ? error.message : 'Audit log list failed',
      requestId: req.requestId || null,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), authorizeModule('audit-log'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total24h, permissionFailures, policyExceptions, suspiciousIps] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: last24Hours } } }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: last24Hours },
          OR: [
            { action: { contains: 'PERMISSION' } },
            { details: { contains: 'insufficient' } },
          ],
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: last24Hours },
          OR: [
            { action: { contains: 'POLICY' } },
            { details: { contains: 'blocked' } },
          ],
        },
      }),
      prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: {
          createdAt: { gte: last24Hours },
          ipAddress: { not: null },
        },
        _count: {
          ipAddress: true,
        },
        having: {
          ipAddress: {
            _count: {
              gte: 20,
            },
          },
        },
        orderBy: {
          _count: {
            ipAddress: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    res.json({
      asOf: new Date().toISOString(),
      summary: {
        total24h,
        permissionFailures,
        policyExceptions,
        suspiciousIpCount: suspiciousIps.length,
      },
      suspiciousIps: suspiciousIps
        .filter((row) => Boolean(row.ipAddress))
        .map((row) => ({
          ipAddress: hasSensitiveDataAccess(req) ? String(row.ipAddress) : maskIpAddress(String(row.ipAddress)),
          eventCount: row._count.ipAddress || 0,
        })),
    });
  } catch (error) {
    void captureOperationalAlert({
      severity: 'WARNING',
      source: 'audit.dashboard',
      message: error instanceof Error ? error.message : 'Audit dashboard failed',
      requestId: req.requestId || null,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-sequence', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), authorizeModule('audit-log'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await verifyAuditIntegrity();
    res.status(result.verified ? 200 : 409).json(result);
  } catch (error) {
    console.error('Audit integrity verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), authorizeModule('audit-log'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed = await enforceSensitiveDataAccess(req, res, 'audit export');
    if (!allowed) {
      return;
    }

    await ensureExportAuditTable();

    const parsed = auditExportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid export query',
        details: parsed.error.issues,
      });
      return;
    }

    const { format = 'csv', limit = 1000, userId, action, from, to } = parsed.data;
    const where = buildAuditWhereClause({ userId, action, from, to });

    const events = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const payload = events.map((event) => ({
      id: event.id,
      timestamp: event.createdAt.toISOString(),
      userId: event.userId,
      userName: event.user.name,
      userEmail: event.user.email,
      userRole: event.user.role,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      ipAddress: event.ipAddress,
      details: event.details,
    }));

    const exportEnvelope = {
      policy: {
        immutable: true,
        retentionDays: AUDIT_RETENTION_DAYS,
      },
      exportedAt: new Date().toISOString(),
      total: payload.length,
      events: payload,
    };

    const signed = signExportPayload(JSON.stringify(exportEnvelope));
    const exportFilters: Prisma.JsonObject = {
      userId: userId ?? null,
      action: action ?? null,
      from: from ?? null,
      to: to ?? null,
      limit,
    };

    await prisma.exportAuditRecord.create({
      data: {
        id: crypto.randomUUID(),
        requestedBy: req.user?.email || 'unknown',
        requestId: req.requestId || null,
        format,
        rows: payload.length,
        digest: signed.digest,
        signature: signed.signature,
        filters: exportFilters,
      },
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.json"`);
      res.setHeader('x-audit-export-digest', signed.digest);
      res.setHeader('x-audit-export-signature', signed.signature);
      res.json(exportEnvelope);
      return;
    }

    const headers = [
      'id',
      'timestamp',
      'userId',
      'userName',
      'userEmail',
      'userRole',
      'action',
      'targetType',
      'targetId',
      'ipAddress',
      'details',
    ];

    const lines = [
      headers.map((header) => formatCsvValue(header)).join(','),
      ...payload.map((event) =>
        [
          event.id,
          event.timestamp,
          event.userId,
          event.userName,
          event.userEmail,
          event.userRole,
          event.action,
          event.targetType,
          event.targetId || '',
          event.ipAddress || '',
          event.details || '',
        ]
          .map((value) => formatCsvValue(value))
          .join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.setHeader('x-audit-export-digest', signed.digest);
    res.setHeader('x-audit-export-signature', signed.signature);
    res.send(lines.join('\n'));
  } catch (error) {
    void captureOperationalAlert({
      severity: 'CRITICAL',
      source: 'audit.export',
      message: error instanceof Error ? error.message : 'Audit export failed',
      requestId: req.requestId || null,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/export-jobs', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), authorizeModule('audit-log'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const flags = await readFeatureFlags();
    if (!flags.enableBackgroundExportQueue) {
      res.status(409).json({ error: 'Background export queue is disabled by feature flag' });
      return;
    }

    const allowed = await enforceSensitiveDataAccess(req, res, 'audit export job queue');
    if (!allowed) {
      return;
    }

    const parsed = auditExportQuerySchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid export job payload', details: parsed.error.issues });
      return;
    }

    const queued = await enqueueBackgroundJob({
      type: 'AUDIT_EXPORT',
      payload: {
        requestedBy: req.user?.email || null,
        filters: parsed.data,
      },
      createdBy: req.user?.email || null,
    });

    res.status(202).json({ queued: true, jobId: queued.id });
  } catch (error) {
    void captureOperationalAlert({
      severity: 'WARNING',
      source: 'audit.export_jobs',
      message: error instanceof Error ? error.message : 'Failed to enqueue export job',
      requestId: req.requestId || null,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
