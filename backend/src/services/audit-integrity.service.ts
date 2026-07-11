import { createHash, createHmac, timingSafeEqual } from 'crypto';
import prisma from '../config/database';

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
    const rows = await prisma.auditLog.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        userId: true,
        action: true,
        targetType: true,
        targetId: true,
        details: true,
        ipAddress: true,
        createdAt: true,
      },
      skip,
      take: batchSize,
    });

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

const upsertIntegrityAnchor = async (hash: string, count: number, latestAt: string): Promise<void> => {
  const signature = computeSignature(getSigningMaterial(hash, count, latestAt));

  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: ANCHOR_HASH_KEY },
      update: { value: hash },
      create: { key: ANCHOR_HASH_KEY, value: hash },
    }),
    prisma.systemSetting.upsert({
      where: { key: ANCHOR_SIGNATURE_KEY },
      update: { value: signature },
      create: { key: ANCHOR_SIGNATURE_KEY, value: signature },
    }),
    prisma.systemSetting.upsert({
      where: { key: ANCHOR_COUNT_KEY },
      update: { value: String(count) },
      create: { key: ANCHOR_COUNT_KEY, value: String(count) },
    }),
    prisma.systemSetting.upsert({
      where: { key: ANCHOR_LATEST_AT_KEY },
      update: { value: latestAt },
      create: { key: ANCHOR_LATEST_AT_KEY, value: latestAt },
    }),
  ]);
};

export type AuditIntegrityVerification = {
  verified: boolean;
  initialized: boolean;
  rotated: boolean;
  totalLogs: number;
  anchorCount: number;
  anchorHash: string;
  currentHash: string;
  latestLogAt: string;
  message: string;
};

export const verifyAuditIntegrity = async (): Promise<AuditIntegrityVerification> => {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [ANCHOR_HASH_KEY, ANCHOR_SIGNATURE_KEY, ANCHOR_COUNT_KEY, ANCHOR_LATEST_AT_KEY],
      },
    },
  });

  const settingMap = new Map(settings.map((item) => [item.key, item.value]));
  const anchorHash = settingMap.get(ANCHOR_HASH_KEY) || '';
  const anchorSignature = settingMap.get(ANCHOR_SIGNATURE_KEY) || '';
  const anchorCount = Number.parseInt(settingMap.get(ANCHOR_COUNT_KEY) || '0', 10) || 0;
  const anchorLatestAt = settingMap.get(ANCHOR_LATEST_AT_KEY) || '';

  const chain = await computeAuditChain(anchorCount);

  if (!anchorHash || !anchorSignature) {
    await upsertIntegrityAnchor(chain.finalHash, chain.totalLogs, chain.latestLogAt);
    return {
      verified: true,
      initialized: true,
      rotated: true,
      totalLogs: chain.totalLogs,
      anchorCount: chain.totalLogs,
      anchorHash: chain.finalHash,
      currentHash: chain.finalHash,
      latestLogAt: chain.latestLogAt,
      message: 'Audit integrity anchor initialized',
    };
  }

  const expectedSignature = computeSignature(getSigningMaterial(anchorHash, anchorCount, anchorLatestAt));
  if (!safeEqualHex(anchorSignature, expectedSignature)) {
    return {
      verified: false,
      initialized: false,
      rotated: false,
      totalLogs: chain.totalLogs,
      anchorCount,
      anchorHash,
      currentHash: chain.finalHash,
      latestLogAt: chain.latestLogAt,
      message: 'Stored audit anchor signature is invalid',
    };
  }

  if (chain.totalLogs < anchorCount) {
    return {
      verified: false,
      initialized: false,
      rotated: false,
      totalLogs: chain.totalLogs,
      anchorCount,
      anchorHash,
      currentHash: chain.finalHash,
      latestLogAt: chain.latestLogAt,
      message: 'Audit log truncation detected',
    };
  }

  if (chain.hashAtAnchorCount !== anchorHash) {
    return {
      verified: false,
      initialized: false,
      rotated: false,
      totalLogs: chain.totalLogs,
      anchorCount,
      anchorHash,
      currentHash: chain.finalHash,
      latestLogAt: chain.latestLogAt,
      message: 'Audit hash chain mismatch before anchored checkpoint',
    };
  }

  if (chain.totalLogs > anchorCount || chain.finalHash !== anchorHash) {
    await upsertIntegrityAnchor(chain.finalHash, chain.totalLogs, chain.latestLogAt);
    return {
      verified: true,
      initialized: false,
      rotated: true,
      totalLogs: chain.totalLogs,
      anchorCount: chain.totalLogs,
      anchorHash: chain.finalHash,
      currentHash: chain.finalHash,
      latestLogAt: chain.latestLogAt,
      message: 'Audit sequence integrity verified and anchor rotated',
    };
  }

  return {
    verified: true,
    initialized: false,
    rotated: false,
    totalLogs: chain.totalLogs,
    anchorCount,
    anchorHash,
    currentHash: chain.finalHash,
    latestLogAt: chain.latestLogAt,
    message: 'Audit sequence integrity verified',
  };
};
