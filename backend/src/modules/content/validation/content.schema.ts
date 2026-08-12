import { z } from 'zod';

export const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().optional(),
  published: z.boolean().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

export const createServiceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  features: z.array(z.string()).optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaPath: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  status: z.string().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createSavingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  features: z.array(z.string()).optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaPath: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  status: z.string().optional(),
});

export const updateSavingSchema = createSavingSchema.partial();

export const createLoanProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  suited: z.string().min(1, 'Suited is required'),
  docs: z.string().min(1, 'Docs is required'),
  status: z.string().optional(),
  maxAmount: z.string().min(1),
  interestRate: z.string().min(1),
  maxTerm: z.string().min(1),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const updateLoanProductSchema = createLoanProductSchema.partial();

export const createAnnouncementSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(10),
  type: z.enum(['INFO', 'WARNING', 'ALERT']),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  status: z.string().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
