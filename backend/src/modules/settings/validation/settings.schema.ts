import { z } from 'zod';
import { AdminRole } from '@prisma/client';

export const updateSystemSettingsSchema = z.object({
  organizationName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  primaryPhone: z.string().optional(),
  automatedAssignment: z.enum(['ROUND_ROBIN', 'BRANCH_POOL', 'MANUAL']).optional(),
  loanApprovalThreshold: z.number().min(0).optional(),
  complianceLock: z.boolean().optional(),
  dualControlEnabled: z.boolean().optional(),
  kycRequired: z.boolean().optional(),
  allowResubmission: z.boolean().optional(),
  autoAssign: z.boolean().optional(),
});

export const updateFeatureFlagsSchema = z.object({
  enableBackgroundExportQueue: z.boolean().optional(),
  enableSloDashboard: z.boolean().optional(),
  enableAuditPolicyDashboard: z.boolean().optional(),
  enableStrictSensitiveDataPolicy: z.boolean().optional(),
});

export const updateAccessControlSchema = z.object({
  modules: z.array(z.string()).min(1),
});

export const createBranchSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  location: z.string().min(2),
  manager: z.string().optional().nullable(),
  status: z.enum(['OPERATIONAL', 'CLOSED', 'MAINTENANCE']).optional(),
  officeHours: z.string().optional().nullable(),
  mapUrl: z.string().optional().nullable(),
  phonePrimary: z.string().optional().nullable(),
  phoneSecondary: z.string().optional().nullable(),
  published: z.boolean().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
  manager: z.string().optional().nullable(),
  status: z.enum(['OPERATIONAL', 'CLOSED', 'MAINTENANCE']).optional(),
  officeHours: z.string().optional().nullable(),
  mapUrl: z.string().optional().nullable(),
  phonePrimary: z.string().optional().nullable(),
  phoneSecondary: z.string().optional().nullable(),
  published: z.boolean().optional(),
});
