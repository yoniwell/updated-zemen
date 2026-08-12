import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberDevice: z.boolean().optional(),
});

export const inviteAcceptSchema = z.object({
  token: z.string().length(48, 'Invalid token length'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be max 128 characters'),
});

export const verifyEmailSchema = z.object({
  verificationToken: z.string().length(32, 'Invalid verification token format'),
});
