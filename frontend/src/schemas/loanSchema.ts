import { z } from 'zod';

const phoneRegex = /^(\+?[1-9]\d{7,14}|0\d{9})$/;

export const loanTypeRules = {
  REGULAR_LOAN: { tenures: [12, 24, 36, 48, 60] },
  SPECIAL_SHORT_TERM_LOAN: { tenures: [3, 6, 9, 12] },
  SHORT_TERM_LOAN: { tenures: [6, 12] },
  INTERMEDIATE_TERM_LOAN: { tenures: [24, 36, 48] },
  LONG_TERM_LOAN: { tenures: [48, 60, 84] },
  NON_INTERESTS_LOAN: { tenures: [12, 24, 36] },
  VEHICLES_AND_HOUSE_LOAN: { tenures: [36, 48, 60, 84] },
} as const;

const loanBaseSchema = z.object({
  // Email + OTP verification
  email: z.string().trim().email('Enter a valid email address'),
  otpCode: z.string().trim().min(4, 'OTP is required').max(8),

  // Personal Information
  firstName: z.string().trim().min(2, 'First name is required').max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal('')),
  lastName: z.string().trim().min(2, 'Last name is required').max(60),
  membershipNo: z.string().trim().min(1, 'Membership number is required').max(30),
  registeredMobile: z.string().regex(phoneRegex, 'Enter a valid phone number in international format'),
  idType: z.string().trim().min(1, 'ID type is required'),
  maritalStatus: z.enum(['SINGLE', 'MARRIED']),

  // Loan Information
  loanType: z.enum(['REGULAR_LOAN', 'SPECIAL_SHORT_TERM_LOAN', 'SHORT_TERM_LOAN', 'INTERMEDIATE_TERM_LOAN', 'LONG_TERM_LOAN', 'NON_INTERESTS_LOAN', 'VEHICLES_AND_HOUSE_LOAN']),
  branchId: z.string().trim().min(1, 'Preferred branch is required').max(120),
  amount: z.number().positive().optional(),
  tenure: z.union([z.number().int().positive(), z.string()]).optional(),

  // Required Documents
  loanApplicationLetter: z.string().trim().min(1, 'Loan application letter is required'),
  loanRequestForm: z.string().trim().min(1, 'Loan request form is required'),
  personalPhoto: z.string().trim().min(1, 'Personal photo is required'),
  idFrontPhoto: z.string().trim().min(1, 'ID front photo is required'),
  idBackPhoto: z.string().optional().or(z.literal('')),
  marriageCertificate: z.string().trim().min(1, 'Marriage certificate is required'),
  collateralDocument: z.string().trim().min(1, 'Collateral document is required'),
  businessPlan: z.string().trim().min(1, 'Business plan is required'),

  // Collateral Information
  collateralType: z.string().trim().min(1, 'Collateral type is required'),
  collateralDesc: z.string().trim().max(500).optional().or(z.literal('')),

  // Consent
  termsAccepted: z.boolean().refine((value) => value === true, { message: 'You must accept terms and conditions' }),
});

export const loanSchema = loanBaseSchema.superRefine((data, ctx) => {
  const rule = loanTypeRules[data.loanType];

  if (data.tenure && !(rule.tenures as readonly (number | string)[]).includes(typeof data.tenure === 'string' ? parseInt(data.tenure, 10) : data.tenure)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tenure'],
      message: `Tenure is not allowed for ${data.loanType}`,
    });
  }
});

export type LoanFormInput = z.input<typeof loanSchema>;

export const loanStepSchemas = {
  1: loanBaseSchema.pick({ email: true, otpCode: true }),
  2: loanBaseSchema.pick({ firstName: true, middleName: true, lastName: true, membershipNo: true, registeredMobile: true, idType: true, maritalStatus: true }),
  3: loanBaseSchema.pick({ loanType: true, branchId: true, amount: true, tenure: true }),
  4: loanBaseSchema.pick({ loanApplicationLetter: true, loanRequestForm: true, personalPhoto: true, idFrontPhoto: true, idBackPhoto: true, marriageCertificate: true }),
  5: loanBaseSchema.pick({ collateralType: true, collateralDocument: true, collateralDesc: true }),
  6: loanBaseSchema.pick({ businessPlan: true }),
  7: loanBaseSchema.pick({ termsAccepted: true }),
};
