import { z } from 'zod';

const phoneRegex = /^(\+?[1-9]\d{7,14}|0\d{9})$/;

export const membershipSchema = z.object({
  email: z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address'),
  otpCode: z.string().trim().min(1, 'OTP verification code is required').length(6, 'OTP code must be 6 digits'),

  phone: z.string().trim().min(1, 'Mobile phone number is required').regex(phoneRegex, 'Please enter a valid phone number'),
  firstName: z.string().trim().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  fathersName: z.string().trim().min(1, "Father's name is required").min(2, "Father's name must be at least 2 characters"),
  grandfathersName: z.string().trim().min(1, "Grandfather's name is required").min(2, "Grandfather's name must be at least 2 characters"),

  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'STUDENT_ID', 'KEBELE_ID'], {
    message: 'Please select a valid ID type',
  }),
  idNumber: z.string().trim().min(1, 'ID number is required').min(3, 'ID number must be at least 3 characters'),
  idFrontName: z.string().min(1, 'Please upload the front of your ID document'),
  idBackName: z.string().optional(),

  applicantPhotoName: z.string().min(1, 'Please upload a passport-sized applicant photo'),
  filledFormName: z.string().optional(),

  membershipPaymentAmount: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return Number(v);
  }, z.number({ message: 'Membership payment amount is required' }).min(10, 'Minimum membership payment is 10 ETB')),
  membershipTransactionRef: z.string().trim().min(1, 'Membership transaction reference is required').min(3, 'Transaction reference must be at least 3 characters'),
  membershipPaymentProofName: z.string().min(1, 'Please upload proof of membership payment receipt'),

  savingType: z.string().min(1, 'Please select a saving type'),
  savingPaymentAmount: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return Number(v);
  }, z.number({ message: 'Initial saving amount is required' }).positive('Saving amount must be greater than 0')),
  savingTransactionRef: z.string().trim().min(1, 'Saving transaction reference is required').min(3, 'Transaction reference must be at least 3 characters'),
  savingProofName: z.string().min(1, 'Please upload proof of initial saving payment receipt'),

  preferredBranch: z.string().trim().min(1, 'Please select your preferred branch'),
  termsAccepted: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
});

export type MembershipFormInput = z.input<typeof membershipSchema>;
export type MembershipFormData = z.output<typeof membershipSchema>;

export const membershipStepSchemas = {
  1: membershipSchema.pick({ email: true, otpCode: true }),
  2: membershipSchema.pick({ phone: true, firstName: true, fathersName: true, grandfathersName: true }),
  3: membershipSchema.pick({ idType: true, idNumber: true, idFrontName: true, idBackName: true }),
  4: membershipSchema.pick({ applicantPhotoName: true, filledFormName: true }),
  5: membershipSchema.pick({ membershipPaymentAmount: true, membershipTransactionRef: true, membershipPaymentProofName: true, savingType: true, savingPaymentAmount: true, savingTransactionRef: true, savingProofName: true, preferredBranch: true, termsAccepted: true }),
};
