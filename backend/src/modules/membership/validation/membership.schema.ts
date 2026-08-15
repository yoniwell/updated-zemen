import { z } from 'zod';

export const applyMembershipSchema = z.object({
  firstName: z.string().optional(),
  fathersName: z.string().optional(),
  grandfathersName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().or(z.literal('')),
  branchId: z.string().uuid().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  membershipPaymentAmount: z.number().optional(),
  membershipTransactionRef: z.string().optional(),
  savingType: z.string().optional(),
  savingCategory: z.string().optional(),
  savingPaymentAmount: z.number().optional(),
  savingTransactionRef: z.string().optional(),
});

export const updateMembershipStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  note: z.string().optional(),
  expectedUpdatedAt: z.string().or(z.date()).optional(),
});

export const assignMembershipSchema = z.object({
  assigneeId: z.string().uuid(),
});

export const updateMembershipSchema = z.object({
  firstName: z.string().optional(),
  fathersName: z.string().optional(),
  grandfathersName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().or(z.literal('')),
  membershipPaymentAmount: z.number().optional(),
  membershipTransactionRef: z.string().optional(),
  savingType: z.string().optional(),
  savingCategory: z.string().optional(),
  savingPaymentAmount: z.number().optional(),
  savingTransactionRef: z.string().optional(),
});
