import { z } from 'zod';

const phoneRegex = /^(\+?[1-9]\d{7,14}|0\d{9})$/;

export const genericTenures = [3, 6, 9, 12, 24, 36, 48, 60, 72, 84];

const loanBaseSchema = z.object({
  // Email + OTP verification
  email: z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address'),
  otpCode: z.string().trim().min(1, 'OTP verification code is required').length(6, 'OTP code must be 6 digits'),

  // Personal Information
  firstName: z.string().trim().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  fathersName: z.string().trim().min(1, "Father's name is required").min(2, "Father's name must be at least 2 characters"),
  grandfathersName: z.string().trim().min(1, "Grandfather's name is required").min(2, "Grandfather's name must be at least 2 characters"),
  membershipNo: z.string().trim().min(1, 'Membership number is required').min(3, 'Membership number must be at least 3 characters'),
  phone: z.string().trim().min(1, 'Mobile phone number is required').regex(phoneRegex, 'Please enter a valid phone number'),
  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'STUDENT_ID', 'KEBELE_ID'], {
    message: 'Please select a valid ID type',
  }),
  idNumber: z.string().trim().min(1, 'ID number is required').min(3, 'ID number must be at least 3 characters'),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], {
    message: 'Please select your marital status',
  }),

  // Loan Information
  loanType: z.string().trim().min(1, 'Please select a loan product'),
  loanCategory: z.string().trim().optional(),
  branchId: z.string().trim().min(1, 'Please select a branch'),
  amount: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return Number(v);
  }, z.number({ message: 'Loan amount is required' }).min(100, 'Minimum loan amount is 100 ETB')),
  tenure: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return Number(v);
  }, z.number({ message: 'Loan tenure is required' }).int('Tenure must be a whole number of months').positive('Tenure must be at least 1 month')),

  // Required Documents
  loanApplicationLetter: z.string().min(1, 'Please upload your official loan application letter'),
  loanRequestForm: z.string().min(1, 'Please upload your signed loan request form'),
  personalPhoto: z.string().min(1, 'Please upload your passport-sized photo'),
  idFrontPhoto: z.string().min(1, 'Please upload the front of your ID document'),
  idBackPhoto: z.string().optional(),
  marriageCertificate: z.string().min(1, 'Please upload your marital status / marriage certificate'),

  // Collateral Information
  collateralType: z.string().trim().min(1, 'Please select collateral type'),
  collateralDocument: z.string().min(1, 'Please upload collateral proof document'),
  collateralDesc: z.string().trim().min(1, 'Collateral description is required').min(5, 'Collateral description must be at least 5 characters'),

  // Business Information
  businessPlan: z.string().min(1, 'Please upload your business plan document'),

  // Consent
  termsAccepted: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
});

export const loanSchema = loanBaseSchema;

export type LoanFormInput = z.input<typeof loanSchema>;

export const loanStepSchemas = {
  1: loanBaseSchema.pick({ email: true, otpCode: true }),
  2: loanBaseSchema.pick({ firstName: true, fathersName: true, grandfathersName: true, membershipNo: true, phone: true, idType: true, idNumber: true, maritalStatus: true }),
  3: loanBaseSchema.pick({ loanType: true, loanCategory: true, branchId: true, amount: true, tenure: true }),
  4: loanBaseSchema.pick({ loanApplicationLetter: true, loanRequestForm: true, personalPhoto: true, idFrontPhoto: true, idBackPhoto: true, marriageCertificate: true }),
  5: loanBaseSchema.pick({ collateralType: true, collateralDocument: true, collateralDesc: true }),
  6: loanBaseSchema.pick({ businessPlan: true }),
  7: loanBaseSchema.pick({ termsAccepted: true }),
};
