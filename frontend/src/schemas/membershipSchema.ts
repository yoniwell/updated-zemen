import { z } from 'zod';

const phoneRegex = /^(\+?[1-9]\d{7,14}|0\d{9})$/;

export const membershipSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Enter a valid phone number in international format'),
  email: z.string().trim().email('Enter a valid email address'),
  otpCode: z.string().trim().min(4, 'OTP is required').max(8, 'OTP is too long'),

  firstName: z.string().trim().min(2, 'First name is too short').max(60, 'First name is too long'),
  fathersName: z.string().trim().min(2, "Father's name is required").max(60, 'Father\'s name is too long'),
  grandfathersName: z.string().trim().min(2, "Grandfather's name is required").max(60, 'Grandfather\'s name is too long'),

  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'STUDENT_ID', 'KEBELE_ID']),
  idNumber: z.string().trim().min(3, 'ID number is required').max(80, 'ID number is too long'),
  idFrontName: z.string().min(1, 'Front ID file is required'),
  idBackName: z.string().optional().or(z.literal('')),

  applicantPhotoName: z.string().min(1, 'Applicant photo is required'),
  filledFormName: z.string().optional().or(z.literal('')),

  membershipPaymentAmount: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return Number(v);
  }, z.number().min(0, 'Membership payment must be a positive number')),
  membershipPaymentProofName: z.string().optional().or(z.literal('')),

  savingType: z.enum([
    'REGULAR_SAVING',
    'CHILDRENS_SAVING',
    'TIME_DEPOSIT_SAVING',
    'NON_INTEREST_SAVING',
    'DIASPORA_SAVING',
    'VEHICLE_HOUSE_SAVING',
    'CHOICE_SAVING',
  ]).optional(),
  savingPaymentAmount: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return Number(v);
  }, z.number().min(0, 'Saving payment must be a positive number').optional()),
  savingTransactionRef: z.string().trim().optional().or(z.literal('')),
  savingProofName: z.string().optional().or(z.literal('')),

  preferredBranch: z.string().trim().optional().or(z.literal('')),
  termsAccepted: z.boolean().refine((value) => value === true, {
    message: 'You must accept terms and conditions',
  }),
});

export type MembershipFormInput = z.input<typeof membershipSchema>;
export type MembershipFormData = z.output<typeof membershipSchema>;

export const membershipStepSchemas = {
  1: membershipSchema.pick({ email: true, otpCode: true }),
  2: membershipSchema.pick({ phone: true, firstName: true, fathersName: true, grandfathersName: true }),
  3: membershipSchema.pick({ idType: true, idNumber: true, idFrontName: true, idBackName: true }),
  4: membershipSchema.pick({ applicantPhotoName: true, filledFormName: true }),
  5: membershipSchema.pick({ membershipPaymentAmount: true, membershipPaymentProofName: true, savingType: true, savingPaymentAmount: true, savingTransactionRef: true, savingProofName: true, preferredBranch: true, termsAccepted: true }),
};
