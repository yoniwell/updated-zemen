import prisma from '../config/database';

const FEATURE_PREFIX = 'feature.';

export type FeatureFlags = {
  enableBackgroundExportQueue: boolean;
  enableSloDashboard: boolean;
  enableAuditPolicyDashboard: boolean;
  enableStrictSensitiveDataPolicy: boolean;
};

const defaultFlags: FeatureFlags = {
  enableBackgroundExportQueue: true,
  enableSloDashboard: true,
  enableAuditPolicyDashboard: true,
  enableStrictSensitiveDataPolicy: true,
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return fallback;
};

export const readFeatureFlags = async (): Promise<FeatureFlags> => {
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        startsWith: FEATURE_PREFIX,
      },
    },
    select: { key: true, value: true },
  });

  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    enableBackgroundExportQueue: parseBoolean(map.get(`${FEATURE_PREFIX}enableBackgroundExportQueue`), defaultFlags.enableBackgroundExportQueue),
    enableSloDashboard: parseBoolean(map.get(`${FEATURE_PREFIX}enableSloDashboard`), defaultFlags.enableSloDashboard),
    enableAuditPolicyDashboard: parseBoolean(map.get(`${FEATURE_PREFIX}enableAuditPolicyDashboard`), defaultFlags.enableAuditPolicyDashboard),
    enableStrictSensitiveDataPolicy: parseBoolean(map.get(`${FEATURE_PREFIX}enableStrictSensitiveDataPolicy`), defaultFlags.enableStrictSensitiveDataPolicy),
  };
};

export const updateFeatureFlags = async (patch: Partial<FeatureFlags>): Promise<FeatureFlags> => {
  const entries = Object.entries(patch) as Array<[keyof FeatureFlags, boolean | undefined]>;

  for (const [key, value] of entries) {
    if (typeof value !== 'boolean') {
      continue;
    }

    await prisma.systemSetting.upsert({
      where: { key: `${FEATURE_PREFIX}${key}` },
      update: { value: String(value) },
      create: {
        key: `${FEATURE_PREFIX}${key}`,
        value: String(value),
      },
    });
  }

  return readFeatureFlags();
};
