import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { readFeatureFlags } from './feature-flag.service';

export type BackgroundJobType = 'AUDIT_EXPORT';

type BackgroundJobRow = {
  id: string;
  type: string;
  payload: unknown;
  status: string;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
  lastError: string | null;
  createdBy: string | null;
};

let queueEnsured = false;
let workerStarted = false;
let workerPausedUntilMs = 0;

const isWorkerEnabled = (): boolean => {
  const value = (process.env.BACKGROUND_QUEUE_ENABLED || 'true').toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off';
};

const isMySqlDatabase = (): boolean => {
  const url = (process.env.DATABASE_URL || '').toLowerCase();
  return url.startsWith('mysql://') || url.startsWith('mysqls://');
};

const isPreparedStatementLimitError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('max_prepared_stmt_count') || message.includes('code: `1461`') || message.includes('code: 1461');
};

const getWorkerPauseWindowMs = (): number => {
  const configured = Number.parseInt(process.env.BACKGROUND_QUEUE_PAUSE_MS || '600000', 10);
  if (!Number.isFinite(configured) || configured < 60_000) {
    return 600_000;
  }

  return configured;
};

const ensureQueueTable = async (): Promise<void> => {
  if (queueEnsured) {
    return;
  }

  if (isMySqlDatabase()) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS background_job_queue (
        id CHAR(36) PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        payload JSON NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        run_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        finished_at DATETIME(3) NULL,
        last_error TEXT NULL,
        created_by VARCHAR(255) NULL,
        INDEX background_job_queue_status_run_at_idx (status, run_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS background_job_queue (
        id UUID PRIMARY KEY,
        type TEXT NOT NULL,
        payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        last_error TEXT,
        created_by TEXT
      )
    `);

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS background_job_queue_status_run_at_idx ON background_job_queue (status, run_at)'
    );
  }

  queueEnsured = true;
};

export const enqueueBackgroundJob = async (params: {
  type: BackgroundJobType;
  payload: Record<string, unknown>;
  createdBy?: string | null;
  runAt?: Date;
}): Promise<{ id: string }> => {
  await ensureQueueTable();

  const created = await prisma.backgroundJobQueue.create({
    data: {
      type: params.type,
      payload: params.payload as Prisma.InputJsonValue,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 5,
      runAt: params.runAt || new Date(),
      createdBy: params.createdBy || null,
    },
    select: {
      id: true,
    },
  });

  return { id: created.id };
};

const pickNextJob = async (): Promise<BackgroundJobRow | null> => {
  await ensureQueueTable();

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.backgroundJobQueue.findFirst({
      where: {
        status: {
          in: ['PENDING', 'RETRY'],
        },
        runAt: {
          lte: new Date(),
        },
      },
      orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
    });

    if (!candidate) {
      return null;
    }

    const claimed = await tx.backgroundJobQueue.updateMany({
      where: {
        id: candidate.id,
        status: {
          in: ['PENDING', 'RETRY'],
        },
      },
      data: {
        status: 'RUNNING',
        attempts: {
          increment: 1,
        },
      },
    });

    if (claimed.count === 0) {
      return null;
    }

    return tx.backgroundJobQueue.findUnique({ where: { id: candidate.id } });
  });
};

const markCompleted = async (id: string): Promise<void> => {
  await prisma.backgroundJobQueue.update({
    where: { id },
    data: {
      status: 'DONE',
      finishedAt: new Date(),
      lastError: null,
    },
  });
};

const markFailed = async (job: BackgroundJobRow, error: unknown): Promise<void> => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const shouldRetry = job.attempts < job.maxAttempts;

  await prisma.backgroundJobQueue.update({
    where: { id: job.id },
    data: {
      status: shouldRetry ? 'RETRY' : 'FAILED',
      runAt: shouldRetry ? new Date(Date.now() + 2 * 60 * 1000) : job.runAt,
      finishedAt: shouldRetry ? null : new Date(),
      lastError: message.slice(0, 1000),
    },
  });
};

const processAuditExportJob = async (job: BackgroundJobRow): Promise<void> => {
  const payload = (job.payload || {}) as {
    requestedBy?: string;
    filters?: Record<string, unknown>;
  };

  const count = await prisma.auditLog.count();

  await prisma.notificationEvent.create({
    data: {
      status: 'INFO',
      title: `Background audit export prepared (${count} records snapshot)`,
      recipient: payload.requestedBy || 'admin',
      type: 'REPORT_DELIVERY',
    },
  });
};

const processJob = async (job: BackgroundJobRow): Promise<void> => {
  if (job.type === 'AUDIT_EXPORT') {
    await processAuditExportJob(job);
    return;
  }

  throw new Error(`Unsupported background job type: ${job.type}`);
};

const runWorkerCycle = async (): Promise<void> => {
  let job: BackgroundJobRow | null = null;

  try {
    if (workerPausedUntilMs > Date.now()) {
      return;
    }

    const flags = await readFeatureFlags();
    if (!flags.enableBackgroundExportQueue) {
      return;
    }

    job = await pickNextJob();
    if (!job) {
      return;
    }

    await processJob(job);
    await markCompleted(job.id);
    logger.info('background_job_completed', { jobId: job.id, type: job.type, attempts: job.attempts });
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      workerPausedUntilMs = Date.now() + getWorkerPauseWindowMs();
      logger.errorWithException('background_job_worker_paused_due_prepared_stmt_limit', error, {
        resumeAt: new Date(workerPausedUntilMs).toISOString(),
      });
      return;
    }

    if (job) {
      try {
        await markFailed(job, error);
      } catch (markFailedError) {
        logger.errorWithException('background_job_mark_failed_error', markFailedError, {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
        });
      }

      logger.errorWithException('background_job_failed', error, { jobId: job.id, type: job.type, attempts: job.attempts });
      return;
    }

    logger.errorWithException('background_job_worker_cycle_failed', error);
  }
};

export const startBackgroundJobWorker = (): void => {
  if (workerStarted || !isWorkerEnabled()) {
    return;
  }

  workerStarted = true;

  void runWorkerCycle();
  setInterval(() => {
    void runWorkerCycle();
  }, Math.max(5_000, Number.parseInt(process.env.BACKGROUND_QUEUE_POLL_MS || '15000', 10) || 15000));
};

export const listBackgroundJobs = async (limit = 100): Promise<Array<{ id: string; type: string; status: string; attempts: number; createdAt: string; finishedAt: string | null; lastError: string | null }>> => {
  await ensureQueueTable();

  const rows = await prisma.backgroundJobQueue.findMany({
    select: {
      id: true,
      type: true,
      status: true,
      attempts: true,
      createdAt: true,
      finishedAt: true,
      lastError: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: Math.max(1, Math.min(500, limit)),
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    lastError: row.lastError,
  }));
};
