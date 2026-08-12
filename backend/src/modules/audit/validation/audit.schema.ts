import { z } from 'zod';

export const auditQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  targetType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
