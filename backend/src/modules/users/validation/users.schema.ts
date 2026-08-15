import { z } from 'zod';
import { AdminRole } from '@prisma/client';

const optionalBranchId = z.string().uuid('Invalid branch ID').nullable().optional().or(z.literal(''));

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.nativeEnum(AdminRole),
  branchId: optionalBranchId,
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.nativeEnum(AdminRole).optional(),
  branchId: optionalBranchId,
  isActive: z.boolean().optional(),
});

export const updateUserPasswordSchema = z.object({
  passwordHash: z.string().min(6),
});

export const bulkCreateUserSchema = z.object({
  users: z.array(createUserSchema).min(1).max(100),
});

export const usersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  role: z.nativeEnum(AdminRole).optional(),
  branchId: optionalBranchId,
  isActive: z.enum(['true', 'false']).optional(),
  status: z.enum(['active', 'inactive', 'true', 'false']).optional(),
});
