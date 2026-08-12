import { logger } from '../../../common/utils/logger';
import { readFeatureFlags } from '../../system/services/feature-flag.service';
import { backgroundJobQueueRepository } from '../repositories/background-job-queue.repository';

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
    await backgroundJobQueueRepository.executeRawUnsafe(`
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
    await backgroundJobQueueRepository.executeRawUnsafe(`
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

    await backgroundJobQueueRepository.executeRawUnsafe(
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
  const created = await backgroundJobQueueRepository.enqueueJob(
    params.type,
    params.payload,
    params.runAt || new Date(),
    params.createdBy || null
  );
  return { id: created.id };
};

const pickNextJob = async (): Promise<BackgroundJobRow | null> => {
  await ensureQueueTable();
  return backgroundJobQueueRepository.pickNextJob();
};

const markCompleted = async (id: string): Promise<void> => {
  await backgroundJobQueueRepository.markCompleted(id);
};

const markFailed = async (job: BackgroundJobRow, error: unknown): Promise<void> => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const shouldRetry = job.attempts < job.maxAttempts;
  const runAt = shouldRetry ? new Date(Date.now() + 2 * 60 * 1000) : job.runAt;

  await backgroundJobQueueRepository.markFailed(job.id, shouldRetry, runAt, message);
};

const processAuditExportJob = async (job: BackgroundJobRow): Promise<void> => {
  const payload = (job.payload || {}) as {
    requestedBy?: string;
    filters?: Record<string, unknown>;
  };

  const count = await backgroundJobQueueRepository.countAuditLogs();

  await backgroundJobQueueRepository.createNotificationEvent({
    status: 'INFO',
    title: `Background audit export prepared (${count} records snapshot)`,
    recipient: payload.requestedBy || 'admin',
    type: 'REPORT_DELIVERY',
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
    logger.info({ jobId: job.id, type: job.type, attempts: job.attempts }, 'background_job_completed');
  } catch (error) {
    if (isPreparedStatementLimitError(error)) {
      workerPausedUntilMs = Date.now() + getWorkerPauseWindowMs();
      logger.error({
        err: error,
        pausedUntil: new Date(workerPausedUntilMs).toISOString(),
      }, 'background_job_worker_paused_due_prepared_stmt_limit');
      return;
    }

    if (job) {
      try {
        await markFailed(job, error);
      } catch (markFailedError) {
        logger.error({
          err: markFailedError,
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
        }, 'background_job_mark_failed_error');
      }

      logger.error({ err: error, jobId: job.id, type: job.type, attempts: job.attempts }, 'background_job_failed');
      return;
    }

    logger.error({ err: error }, 'background_job_worker_cycle_failed');
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
  const rows = await backgroundJobQueueRepository.listJobs(Math.max(1, Math.min(500, limit)));
  
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
