import prisma from '../config/database';
import { verifyAuditIntegrity } from './audit-integrity.service';

let auditIntegrityJobStarted = false;

const DEFAULT_INTERVAL_MINUTES = 60;
const MIN_INTERVAL_MINUTES = 5;

const getIntervalMs = (): number => {
  const configured = Number.parseInt(process.env.AUDIT_INTEGRITY_VERIFY_INTERVAL_MINUTES || String(DEFAULT_INTERVAL_MINUTES), 10);
  const minutes = Number.isFinite(configured) ? Math.max(MIN_INTERVAL_MINUTES, configured) : DEFAULT_INTERVAL_MINUTES;
  return minutes * 60 * 1000;
};

const isEnabled = (): boolean => {
  const value = (process.env.AUDIT_INTEGRITY_VERIFY_ENABLED || 'true').toLowerCase();
  return value !== 'false' && value !== '0' && value !== 'off';
};

const publishIntegrityAlert = async (result: {
  verified: boolean;
  message: string;
  totalLogs: number;
  anchorCount: number;
  currentHash: string;
  anchorHash: string;
  latestLogAt: string;
}): Promise<void> => {
  await prisma.notificationEvent.create({
    data: {
      status: 'WARNING',
      title: `Audit integrity verification failed: ${result.message}`,
      recipient: 'SECURITY_TEAM',
      type: 'AUDIT_INTEGRITY_ALERT',
    },
  });
};

const runAuditIntegrityCheck = async (): Promise<void> => {
  try {
    const result = await verifyAuditIntegrity();
    if (!result.verified) {
      await publishIntegrityAlert(result);
      console.error('Audit integrity verification failed', {
        message: result.message,
        totalLogs: result.totalLogs,
        anchorCount: result.anchorCount,
        currentHash: result.currentHash,
        anchorHash: result.anchorHash,
        latestLogAt: result.latestLogAt,
      });
      return;
    }

    console.log('Audit integrity verification completed', {
      totalLogs: result.totalLogs,
      rotated: result.rotated,
      initialized: result.initialized,
    });
  } catch (error) {
    console.error('Audit integrity verification job error:', error);
  }
};

export const startAuditIntegrityVerificationJob = (): void => {
  if (auditIntegrityJobStarted || !isEnabled()) {
    return;
  }

  auditIntegrityJobStarted = true;
  const intervalMs = getIntervalMs();

  void runAuditIntegrityCheck();
  setInterval(() => {
    void runAuditIntegrityCheck();
  }, intervalMs);
};
