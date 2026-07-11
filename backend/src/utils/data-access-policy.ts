import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { readFeatureFlags } from '../services/feature-flag.service';

export const hasSensitiveDataAccess = (req: AuthRequest): boolean => {
  const role = req.user?.role;
  return role === 'SUPER_ADMIN';
};

export const enforceSensitiveDataAccess = async (
  req: AuthRequest,
  res: Response,
  operation: string
): Promise<boolean> => {
  const flags = await readFeatureFlags();
  if (!flags.enableStrictSensitiveDataPolicy) {
    return true;
  }

  if (hasSensitiveDataAccess(req)) {
    return true;
  }

  res.status(403).json({
    error: `Sensitive data policy denied: ${operation}`,
  });
  return false;
};

export const maskEmail = (value: string): string => {
  const [name, domain] = value.split('@');
  if (!name || !domain) {
    return 'hidden';
  }

  const prefix = name.length <= 2 ? '*'.repeat(name.length) : `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}`;
  return `${prefix}@${domain}`;
};

export const maskIpAddress = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  if (value.includes(':')) {
    return `${value.split(':').slice(0, 4).join(':')}::xxxx`;
  }

  const parts = value.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }

  return 'hidden';
};
