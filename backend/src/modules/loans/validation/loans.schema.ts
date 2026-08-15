import { z } from 'zod';

export const applyLoanSchema = z.object({
  firstName: z.string().optional(),
  fathersName: z.string().optional(),
  grandfathersName: z.string().optional(),
  membershipNo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().or(z.literal('')),
  branchId: z.string().uuid().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  maritalStatus: z.string().optional(),
  
  loanType: z.string().optional(),
  loanCategory: z.string().optional(),
  amount: z.number().optional(),
  tenure: z.number().optional(),
  
  collateralType: z.string().optional(),
  collateralDesc: z.string().optional(),
});

export const updateLoanStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  note: z.string().optional(),
  expectedUpdatedAt: z.string().or(z.date()).optional(),
});

export const assignLoanSchema = z.object({
  assigneeId: z.string().uuid(),
});

export const updateLoanSchema = z.object({
  firstName: z.string().optional(),
  fathersName: z.string().optional(),
  grandfathersName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().or(z.literal('')),
  amount: z.number().optional(),
  durationMonths: z.number().optional(),
});
