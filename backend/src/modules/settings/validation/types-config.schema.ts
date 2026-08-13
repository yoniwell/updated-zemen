import { z } from 'zod';

export const createTypeConfigSchema = z.object({
  name: z.string().min(2),
  isActive: z.boolean().optional(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  maxTenure: z.number().nullable().optional(),
  membershipFee: z.number().nullable().optional(),
});

export const updateTypeConfigSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  minAmount: z.number().nullable().optional(),
  maxAmount: z.number().nullable().optional(),
  maxTenure: z.number().nullable().optional(),
  membershipFee: z.number().nullable().optional(),
});
