import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { auditIntegrityRepository } from '../repositories/audit-integrity.repository';

const EMPTY_CHAIN_HASH = '0'.repeat(64);
const ANCHOR_HASH_KEY = 'AUDIT_CHAIN_ANCHOR_HASH';
const ANCHOR_SIGNATURE_KEY = 'AUDIT_CHAIN_ANCHOR_SIGNATURE';
const ANCHOR_COUNT_KEY = 'AUDIT_CHAIN_ANCHOR_COUNT';
const ANCHOR_LATEST_AT_KEY = 'AUDIT_CHAIN_ANCHOR_LATEST_AT';

const getIntegritySecret = (): string =>
  process.env.AUDIT_INTEGRITY_SECRET || process.env.JWT_SECRET || 'dev-audit-integrity-secret';

const computeHash = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

const computeSignature = (material: string): string =>
  createHmac('sha256', getIntegritySecret()).update(material).digest('hex');

const safeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
};

const getSigningMaterial = (hash: string, count: number, latestAt: string): string =>
  `${hash}|${count}|${latestAt}`;

type ChainResult = {
  totalLogs: number;
  finalHash: string;
  hashAtAnchorCount: string | null;
  latestLogAt: string;
};

const computeAuditChain = async (anchorCount: number): Promise<ChainResult> => {
  const batchSize = 1000;
  let skip = 0;
  let totalLogs = 0;
  let rollingHash = EMPTY_CHAIN_HASH;
  let hashAtAnchorCount: string | null = anchorCount === 0 ? EMPTY_CHAIN_HASH : null;
  let latestLogAt = '';

  while (true) {
    const rows = await auditIntegrityRepository.getAuditLogsBatch(skip, batchSize);

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const payload = [
        row.id,
        row.userId,
        row.action,
        row.targetType,
        row.targetId || '',
        row.details || '',
        row.ipAddress || '',
        row.createdAt.toISOString(),
      ].join('|');

      rollingHash = computeHash(`${rollingHash}|${payload}`);
      totalLogs += 1;
      latestLogAt = row.createdAt.toISOString();

      if (totalLogs === anchorCount) {
        hashAtAnchorCount = rollingHash;
      }
    }

    skip += rows.length;
  }

  return {
    totalLogs,
    finalHash: rollingHash,
    hashAtAnchorCount,
    latestLogAt,
  };
};

export async function anchorAuditChain(): Promise<{
  success: boolean;
  message: string;
  count: number;
  hash: string;
}> {
  const currentSettings = await auditIntegrityRepository.getSystemSettings([
    ANCHOR_COUNT_KEY,
  ]);

  const countSetting = currentSettings.find(s => s.key === ANCHOR_COUNT_KEY);
  const currentCount = countSetting ? parseInt(countSetting.value, 10) : 0;

  const result = await computeAuditChain(currentCount);

  if (result.totalLogs === currentCount) {
    return {
      success: true,
      message: 'No new logs to anchor.',
      count: currentCount,
      hash: result.finalHash,
    };
  }

  const material = getSigningMaterial(result.finalHash, result.totalLogs, result.latestLogAt);
  const signature = computeSignature(material);

  await auditIntegrityRepository.upsertSystemSetting(ANCHOR_HASH_KEY, result.finalHash);
  await auditIntegrityRepository.upsertSystemSetting(ANCHOR_SIGNATURE_KEY, signature);
  await auditIntegrityRepository.upsertSystemSetting(ANCHOR_COUNT_KEY, result.totalLogs.toString());
  await auditIntegrityRepository.upsertSystemSetting(ANCHOR_LATEST_AT_KEY, result.latestLogAt);

  return {
    success: true,
    message: `Anchored chain up to ${result.totalLogs} logs.`,
    count: result.totalLogs,
    hash: result.finalHash,
  };
}

export async function verifyAuditIntegrity(): Promise<{
  valid: boolean;
  message: string;
  totalLogs: number;
  anchoredLogs: number;
}> {
  const settings = await auditIntegrityRepository.getSystemSettings([
    ANCHOR_HASH_KEY,
    ANCHOR_SIGNATURE_KEY,
    ANCHOR_COUNT_KEY,
    ANCHOR_LATEST_AT_KEY,
  ]);

  const dict: Record<string, string> = {};
  for (const s of settings) {
    dict[s.key] = s.value;
  }

  const anchorHash = dict[ANCHOR_HASH_KEY];
  const anchorSignature = dict[ANCHOR_SIGNATURE_KEY];
  const anchorCountStr = dict[ANCHOR_COUNT_KEY];
  const anchorLatestAt = dict[ANCHOR_LATEST_AT_KEY];

  if (!anchorHash || !anchorSignature || !anchorCountStr || !anchorLatestAt) {
    const result = await computeAuditChain(0);
    if (result.totalLogs === 0) {
      return {
        valid: true,
        message: 'No logs exist. System is clean.',
        totalLogs: 0,
        anchoredLogs: 0,
      };
    }
    return {
      valid: false,
      message: 'No integrity anchor found, but logs exist. Chain cannot be verified.',
      totalLogs: result.totalLogs,
      anchoredLogs: 0,
    };
  }

  const anchorCount = parseInt(anchorCountStr, 10);
  const material = getSigningMaterial(anchorHash, anchorCount, anchorLatestAt);
  const expectedSignature = computeSignature(material);

  if (!safeEqualHex(anchorSignature, expectedSignature)) {
    return {
      valid: false,
      message: 'Anchor signature mismatch. The anchor itself has been tampered with.',
      totalLogs: -1,
      anchoredLogs: anchorCount,
    };
  }

  const result = await computeAuditChain(anchorCount);

  if (result.hashAtAnchorCount === null) {
    return {
      valid: false,
      message: `Database has fewer logs (${result.totalLogs}) than the anchored count (${anchorCount}). Logs were deleted.`,
      totalLogs: result.totalLogs,
      anchoredLogs: anchorCount,
    };
  }

  if (result.hashAtAnchorCount !== anchorHash) {
    return {
      valid: false,
      message: `Chain hash mismatch at anchored point. Logs before record ${anchorCount} were modified.`,
      totalLogs: result.totalLogs,
      anchoredLogs: anchorCount,
    };
  }

  return {
    valid: true,
    message: `Chain is valid. Anchored up to ${anchorCount} logs. Current total is ${result.totalLogs}.`,
    totalLogs: result.totalLogs,
    anchoredLogs: anchorCount,
  };
}
