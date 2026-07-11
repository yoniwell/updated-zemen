import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Router, Response, Request } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize, authorizeModule, AuthRequest } from '../middleware/auth';
import { sendValidationError } from '../utils/api-error';

const buildBranchCode = (name: string): string =>
  name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 8) || 'BRANCH';

const uniqueBranchCode = async (name: string, branchId?: string): Promise<string> => {
  const baseCode = buildBranchCode(name);
  const candidates = [baseCode];

  for (let index = 2; index <= 99; index += 1) {
    candidates.push(`${baseCode}-${index}`.slice(0, 8));
  }

  for (const code of candidates) {
    const branch = await prisma.branch.findFirst({
      where: {
        code,
        ...(branchId ? { NOT: { id: branchId } } : {}),
      },
      select: { id: true },
    });

    if (!branch) {
      return code;
    }
  }

  return `${baseCode}-${Date.now().toString().slice(-4)}`.slice(0, 8);
};

const syncOperationalBranchFromCmsBranch = async (branch: {
  id: string;
  name: string;
  location: string;
  published: boolean;
}): Promise<void> => {
  const existing = await prisma.branch.findFirst({
    where: {
      OR: [{ id: branch.id }, { name: branch.name }],
    },
    select: { id: true, code: true },
  });

  const code = existing?.code || (await uniqueBranchCode(branch.name, existing?.id));

  if (existing) {
    await prisma.branch.update({
      where: { id: existing.id },
      data: {
        name: branch.name,
        code,
        location: branch.location,
        status: branch.published ? 'OPERATIONAL' : 'INACTIVE',
      },
    });
    return;
  }

  await prisma.branch.create({
    data: {
      id: branch.id,
      name: branch.name,
      code,
      location: branch.location,
      manager: null,
      status: branch.published ? 'OPERATIONAL' : 'INACTIVE',
    },
  });
};

const removeOperationalBranchFromCmsBranch = async (branchId: string): Promise<void> => {
  await prisma.branch.deleteMany({ where: { OR: [{ id: branchId }] } });
};

const router = Router();

const cmsRoles = ['SUPER_ADMIN', 'CONTENT_ADMIN'] as const;

router.use(authenticate, authorize(...cmsRoles), authorizeModule('cms'));

const CMS_DOWNLOAD_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.zip', '.jpg', '.jpeg', '.png'] as const;
const CMS_DOWNLOAD_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;
const CMS_DOWNLOAD_MAX_SIZE = 10 * 1024 * 1024;

const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
const cmsDownloadsDirectory = path.join(uploadsRoot, 'cms-downloads');
fs.mkdirSync(cmsDownloadsDirectory, { recursive: true });

const cmsDownloadUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(cmsDownloadsDirectory, { recursive: true });
      cb(null, cmsDownloadsDirectory);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(path.basename(file.originalname)).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: CMS_DOWNLOAD_MAX_SIZE },
  fileFilter: (_req: Request, file, cb) => {
    const extension = path.extname(path.basename(file.originalname)).toLowerCase();
    if (CMS_DOWNLOAD_TYPES.includes(file.mimetype as (typeof CMS_DOWNLOAD_TYPES)[number]) && CMS_DOWNLOAD_EXTENSIONS.includes(extension as (typeof CMS_DOWNLOAD_EXTENSIONS)[number])) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type. Accepted: pdf, doc, docx, xls, xlsx, csv, zip, jpg, jpeg, png'));
  },
});

const parseFileType = (file: Express.Multer.File): string => {
  const extension = path.extname(path.basename(file.originalname)).replace('.', '').toUpperCase();
  return extension || 'FILE';
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const removeManagedDownloadAsset = (link: string | null | undefined): void => {
  if (!link || !link.startsWith('/uploads/cms-downloads/')) return;
  const relative = link.replace('/uploads/', '').replace(/\//g, path.sep);
  const absolutePath = path.join(uploadsRoot, relative);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const runCmsDownloadUpload = (req: AuthRequest, res: Response): Promise<void> =>
  new Promise((resolve, reject) => {
    cmsDownloadUpload.single('file')(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

const CMS_NEWS_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'] as const;
const CMS_NEWS_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'] as const;

const cmsNewsDirectory = path.join(uploadsRoot, 'cms-news');
fs.mkdirSync(cmsNewsDirectory, { recursive: true });

const cmsNewsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(cmsNewsDirectory, { recursive: true });
      cb(null, cmsNewsDirectory);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(path.basename(file.originalname)).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: CMS_DOWNLOAD_MAX_SIZE },
  fileFilter: (_req: Request, file, cb) => {
    const extension = path.extname(path.basename(file.originalname)).toLowerCase();
    if (CMS_NEWS_IMAGE_TYPES.includes(file.mimetype as (typeof CMS_NEWS_IMAGE_TYPES)[number]) && CMS_NEWS_IMAGE_EXTENSIONS.includes(extension as (typeof CMS_NEWS_IMAGE_EXTENSIONS)[number])) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid image type. Accepted: jpg, jpeg, png'));
  },
});

const removeManagedNewsAsset = (imageUrl: string | null | undefined): void => {
  if (!imageUrl || !imageUrl.startsWith('/uploads/cms-news/')) return;
  const relative = imageUrl.replace('/uploads/', '').replace(/\//g, path.sep);
  const absolutePath = path.join(uploadsRoot, relative);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const runCmsNewsUpload = (req: AuthRequest, res: Response): Promise<void> =>
  new Promise((resolve, reject) => {
    cmsNewsUpload.single('image')(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

type CmsFaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CmsNewsRow = {
  id: string;
  title: string;
  excerpt: string;
  content: string | null;
  imageUrl: string | null;
  category: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

// CmsPageRow removed — Pages feature removed from CMS

type CmsDownloadCategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CmsDownloadFileRow = {
  id: string;
  categoryId: string;
  name: string;
  size: string;
  type: string;
  link: string;
  sortOrder: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CmsBranchRow = {
  id: string;
  name: string;
  location: string;
  officeHours: string;
  mapUrl: string;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CmsServiceRow = {
  id: string;
  title: string;
  description: string;
  features: unknown;
  ctaLabel: string | null;
  ctaPath: string | null;
  sortOrder: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CmsSavingRow = {
  id: string;
  title: string;
  description: string;
  features: unknown;
  ctaLabel: string | null;
  ctaPath: string | null;
  sortOrder: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CmsLoanProductRow = {
  id: string;
  name: string;
  purpose: string;
  suited: string;
  docs: string;
  status: string;
  maxAmount: string;
  interestRate: string;
  maxTerm: string;
  color: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type CmsAnnouncementRow = {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  placement: string;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeServiceFeatures = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const faqCreateSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  category: z.string().trim().min(1).default('General'),
  published: z.boolean().default(false),
});

const faqUpdateSchema = z
  .object({
    question: z.string().trim().min(1).optional(),
    answer: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    published: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const newsCreateSchema = z.object({
  title: z.string().trim().min(1),
  excerpt: z.string().trim().min(1),
  content: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  category: z.string().trim().min(1).default('General'),
  status: z.string().trim().min(1).default('DRAFT'),
});

const newsUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    excerpt: z.string().trim().min(1).optional(),
    content: z.string().trim().optional(),
    imageUrl: z.string().trim().optional(),
    category: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

// pageCreateSchema and pageUpdateSchema removed — pages handled outside CMS

const downloadCategoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

const downloadCategoryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    sortOrder: z.number().int().optional(),
    published: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const downloadFileCreateSchema = z.object({
  categoryId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  size: z.string().trim().default(''),
  type: z.string().trim().default('PDF'),
  link: z.string().trim().default('#'),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

const downloadFileUpdateSchema = z
  .object({
    categoryId: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    size: z.string().trim().optional(),
    type: z.string().trim().optional(),
    link: z.string().trim().optional(),
    sortOrder: z.number().int().optional(),
    published: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const cmsBranchCreateSchema = z.object({
  name: z.string().trim().min(1),
  location: z.string().trim().min(1),
  officeHours: z.string().trim().min(1),
  mapUrl: z.string().trim().min(1),
  phonePrimary: z.string().trim().optional(),
  phoneSecondary: z.string().trim().optional(),
  published: z.boolean().default(true),
});

const cmsBranchUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    officeHours: z.string().trim().min(1).optional(),
    mapUrl: z.string().trim().min(1).optional(),
    phonePrimary: z.string().trim().optional(),
    phoneSecondary: z.string().trim().optional(),
    published: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const cmsServiceCreateSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  features: z.union([z.array(z.string()), z.string()]).optional().default([]),
  ctaLabel: z.string().trim().optional(),
  ctaPath: z.string().trim().optional(),
  sortOrder: z.number().int().default(0),
  status: z.string().trim().min(1).default('DRAFT'),
});

const cmsServiceUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    features: z.union([z.array(z.string()), z.string()]).optional(),
    ctaLabel: z.string().trim().optional(),
    ctaPath: z.string().trim().optional(),
    sortOrder: z.number().int().optional(),
    status: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const cmsSavingCreateSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  features: z.union([z.array(z.string()), z.string()]).optional().default([]),
  ctaLabel: z.string().trim().optional(),
  ctaPath: z.string().trim().optional(),
  sortOrder: z.number().int().default(0),
  status: z.string().trim().min(1).default('DRAFT'),
});

const cmsSavingUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    features: z.union([z.array(z.string()), z.string()]).optional(),
    ctaLabel: z.string().trim().optional(),
    ctaPath: z.string().trim().optional(),
    sortOrder: z.number().int().optional(),
    status: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const loanProductCreateSchema = z.object({
  name: z.string().trim().min(1),
  purpose: z.string().trim().min(1),
  suited: z.string().trim().min(1),
  docs: z.string().trim().min(1),
  status: z.string().trim().min(1).default('DRAFT'),
  maxAmount: z.string().trim().min(1),
  interestRate: z.string().trim().min(1),
  maxTerm: z.string().trim().min(1),
  color: z.string().trim().min(1).default('border-l-primary'),
  sortOrder: z.number().int().default(0),
});

const loanProductUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    purpose: z.string().trim().min(1).optional(),
    suited: z.string().trim().min(1).optional(),
    docs: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
    maxAmount: z.string().trim().min(1).optional(),
    interestRate: z.string().trim().min(1).optional(),
    maxTerm: z.string().trim().min(1).optional(),
    color: z.string().trim().min(1).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const announcementCreateSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  type: z.string().trim().min(1).default('Info'),
  status: z.string().trim().min(1).default('Scheduled'),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().optional(),
  placement: z.string().trim().min(1).default('Banner'),
});

const announcementUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
    startDate: z.string().trim().min(1).optional(),
    endDate: z.string().trim().optional(),
    placement: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const downloadUploadCreateSchema = z.object({
  categoryId: z.string().trim().min(1),
  name: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().default(0),
  published: z.union([z.boolean(), z.string()]).optional(),
});

const downloadUploadUpdateSchema = z.object({
  categoryId: z.string().trim().optional(),
  name: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().optional(),
  published: z.union([z.boolean(), z.string()]).optional(),
});

const parseValidationError = (issues: z.ZodIssue[]) =>
  issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));

const resolveParamId = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : String(value || ''));

const defaultCmsServices: Array<{
  title: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaPath: string;
  sortOrder: number;
}> = [
  {
    title: 'Savings',
    description: 'High-yield accounts with zero fees.',
    features: ['Zero Fees', 'Daily Interest', 'Instant Access'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 1,
  },
  {
    title: 'Loan Products',
    description: 'Access flexible loan options with fair rates to support your personal, business, or emergency needs.',
    features: ['Fast Approval', 'No Hidden Charges', 'Expert Advisory'],
    ctaLabel: 'Apply Now',
    ctaPath: '/loans',
    sortOrder: 2,
  },
  {
    title: 'Membership Benefits',
    description: 'Enjoy exclusive benefits, including dividend shares and community support as a valued member.',
    features: ['Annual Dividends', 'Voting Rights', 'Community Events'],
    ctaLabel: 'See Benefits',
    ctaPath: '/membership',
    sortOrder: 3,
  },
  {
    title: 'Digital Services',
    description: 'Manage your accounts, apply for loans, and more through our modern digital platform.',
    features: ['Mobile Access', 'SMS Alerts', 'Secure Login'],
    ctaLabel: 'Go Digital',
    ctaPath: '/how-to-apply',
    sortOrder: 4,
  },
];

const defaultCmsSavings: Array<{
  title: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaPath: string;
  sortOrder: number;
}> = [
  {
    title: 'Regular Compulsory Savings',
    description: 'The foundation of your SACCO membership. Build a strong financial base while unlocking access to our loan products.',
    features: ['Minimum ETB 500/month', 'Qualifies you for loans instantly', 'Earns annual dividends', 'Safe and secure'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 1,
  },
  {
    title: 'Voluntary Savings',
    description: 'Flexible savings for your specific goals. Deposit and withdraw at your convenience while earning competitive interest.',
    features: ['No minimum balance required', 'Flexible deposits', 'Withdraw anytime', 'Competitive interest rate'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 2,
  },
  {
    title: "Children's Savings Account",
    description: "Secure your child's future with an account that grows with them. Ideal for education, first car, or starting capital.",
    features: ['High-yield interest', 'Educational bonuses', 'Parent-controlled until 18', 'No monthly fees'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 3,
  },
  {
    title: 'Fixed Deposit Account',
    description: 'Lock away a lump sum for a fixed period to guarantee our highest interest rates. Perfect for long-term investments.',
    features: ['Highest interest rates', '3, 6, 12, or 24-month terms', 'Guaranteed returns', 'Interest paid on maturity'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 4,
  },
  {
    title: 'Target Savings',
    description: 'Save towards a specific goal-like a wedding, vacation, or down payment. Automatically lock funds until target date.',
    features: ['Goal-oriented', 'Automated transfers', 'Bonus interest on completion', 'Penalty for early withdrawal'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 5,
  },
  {
    title: 'Retirement Savings Plan',
    description: 'Specialized long-term savings to ensure a comfortable future. Tax-efficient and highly secure growth.',
    features: ['Tax benefits', 'Compound interest', 'Retirement planning advice', 'Lump-sum or annuity payout'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 6,
  },
];

const defaultCmsLoanProducts: Array<{
  name: string;
  purpose: string;
  suited: string;
  docs: string;
  maxAmount: string;
  interestRate: string;
  maxTerm: string;
  color: string;
  sortOrder: number;
}> = [
  {
    name: 'Personal Development Loan',
    purpose: 'Supports education, household improvements, health needs, or planned personal expenses.',
    suited: 'Active members with savings history and predictable income.',
    docs: 'Valid ID, Savings Statement, Proof of Income',
    maxAmount: 'Based on savings and affordability',
    interestRate: 'Competitive',
    maxTerm: 'Up to 36 months',
    color: 'border-l-primary',
    sortOrder: 1,
  },
  {
    name: 'Business and Trade Loan',
    purpose: 'Supports business expansion, working capital, trading activity, and income-generating operations.',
    suited: 'Traders, entrepreneurs, and small business operators.',
    docs: 'Business License, Cash Flow Records, 6+ Months Membership',
    maxAmount: 'Based on business cashflow',
    interestRate: 'Competitive',
    maxTerm: 'Up to 48 months',
    color: 'border-l-primary',
    sortOrder: 2,
  },
  {
    name: 'Emergency Support Loan',
    purpose: 'Smaller and faster-response financing for urgent but essential financial needs.',
    suited: 'Active members in good standing with a verifiable urgent need.',
    docs: 'Proof of Emergency, Guarantor Form, Active Account',
    maxAmount: 'Rapid-response limit',
    interestRate: 'Preferential',
    maxTerm: 'Up to 12 months',
    color: 'border-l-primary',
    sortOrder: 3,
  },
];

const defaultCmsNews: Array<{
  title: string;
  excerpt: string;
  content: string;
  category: string;
}> = [
  {
    title: 'Annual General Assembly Meeting 2024',
    excerpt: 'Join us for the upcoming annual general meeting where we will discuss our yearly performance and dividends.',
    content: 'Join us for the upcoming annual general meeting where we will discuss our yearly performance and dividends.',
    category: 'Meeting',
  },
  {
    title: 'New Digital Loan Application Portal Launched',
    excerpt: 'We are excited to announce our new online portal for faster and more convenient loan applications.',
    content: 'We are excited to announce our new online portal for faster and more convenient loan applications.',
    category: 'Product Update',
  },
  {
    title: 'New Branch Opening in Bole',
    excerpt: 'To serve our members better, we have opened a new branch in the heart of Bole sub-city.',
    content: 'To serve our members better, we have opened a new branch in the heart of Bole sub-city.',
    category: 'Branch Notice',
  },
];

const defaultCmsFaqs: Array<{
  question: string;
  answer: string;
  category: string;
  published: boolean;
}> = [
  {
    question: 'Who can become a member of Zemen SACCO?',
    answer: 'Individuals and eligible groups who meet KYC and membership requirements can apply.',
    category: 'Membership',
    published: true,
  },
  {
    question: 'How long does loan approval take?',
    answer: 'Approval timelines depend on documentation completeness and internal review, typically within a few business days.',
    category: 'Loans',
    published: true,
  },
  {
    question: 'Which documents are required for KYC?',
    answer: 'A valid national ID or passport, applicant photo, and proof of address are commonly required.',
    category: 'KYC',
    published: true,
  },
];

const defaultDownloadCategories: Array<{ name: string; sortOrder: number; published: boolean }> = [
  { name: 'Forms', sortOrder: 1, published: true },
  { name: 'Guides', sortOrder: 2, published: true },
];

const defaultDownloadFiles: Array<{
  categoryName: string;
  name: string;
  size: string;
  type: string;
  link: string;
  sortOrder: number;
  published: boolean;
}> = [
  {
    categoryName: 'Forms',
    name: 'Membership Application Form',
    size: 'PDF',
    type: 'PDF',
    link: '#',
    sortOrder: 1,
    published: true,
  },
  {
    categoryName: 'Forms',
    name: 'Loan Application Checklist',
    size: 'PDF',
    type: 'PDF',
    link: '#',
    sortOrder: 2,
    published: true,
  },
  {
    categoryName: 'Guides',
    name: 'Digital Portal User Guide',
    size: 'PDF',
    type: 'PDF',
    link: '#',
    sortOrder: 1,
    published: true,
  },
];

const defaultCmsBranches: Array<{
  name: string;
  location: string;
  officeHours: string;
  mapUrl: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  published: boolean;
}> = [
  {
    name: 'Mekelle Head Office',
    location: 'Adi Hawesi, In front of IOM, Mekelle',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Mekelle+Head+Office&output=embed',
    phonePrimary: '+251953444411',
    phoneSecondary: '+251997346200',
    published: true,
  },
  {
    name: 'Mekelle Branch',
    location: 'Kedamay Weyane, Marturs St., Mekelle',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Kedamay+Weyane+Mekelle&output=embed',
    phonePrimary: '+251997344200',
    phoneSecondary: null,
    published: true,
  },
  {
    name: 'Addis Ababa',
    location: 'Bole Medhanialem, Addis Ababa',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Bole+Medhanialem+Addis+Ababa&output=embed',
    phonePrimary: '+251997339200',
    phoneSecondary: null,
    published: true,
  },
  {
    name: 'Adigrat',
    location: 'Main Road, Near Market Center, Adigrat',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Adigrat,Ethiopia&output=embed',
    phonePrimary: '+251997346200',
    phoneSecondary: null,
    published: true,
  },
  {
    name: 'AbiAdi',
    location: 'Town Center, Service Corridor, AbiAdi',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Abi+Adi,Ethiopia&output=embed',
    phonePrimary: '+251903212300',
    phoneSecondary: null,
    published: true,
  },
  {
    name: 'Maychew',
    location: 'Commercial District, Main Street, Maychew',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Maychew,Ethiopia&output=embed',
    phonePrimary: '+251903047300',
    phoneSecondary: null,
    published: true,
  },
  {
    name: 'Adwa',
    location: 'Central Avenue, Near Municipality, Adwa',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Adwa,Ethiopia&output=embed',
    phonePrimary: '+251997339200',
    phoneSecondary: null,
    published: true,
  },
  {
    name: 'Shire',
    location: 'Downtown Service Zone, Shire',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Shire,Ethiopia&output=embed',
    phonePrimary: '+251997343200',
    phoneSecondary: null,
    published: true,
  },
  {
    name: 'Rama',
    location: 'Main Border Corridor, Rama',
    officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
    mapUrl: 'https://www.google.com/maps?q=Rama,Ethiopia&output=embed',
    phonePrimary: '+251903351300',
    phoneSecondary: null,
    published: true,
  },
];

const defaultCmsAnnouncements: Array<{
  title: string;
  content: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string | null;
  placement: string;
}> = [
  {
    title: 'Welcome to the Zemen Digital Platform',
    content: 'Use the online portals to submit membership and loan applications securely.',
    type: 'Info',
    status: 'Active',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    placement: 'Homepage',
  },
  // Note: banner placements were removed from the default seed to avoid recreating them.
];

const bootstrapCmsServices = async (): Promise<void> => {
  for (const item of defaultCmsServices) {
    const existing = await prisma.cmsService.findFirst({
      where: { title: item.title },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsService.create({
        data: {
          title: item.title,
          description: item.description,
          features: item.features as Prisma.InputJsonValue,
          ctaLabel: item.ctaLabel,
          ctaPath: item.ctaPath,
          sortOrder: item.sortOrder,
          status: 'PUBLISHED',
        },
      });
    }
  }

  // Ensure default savings entries exist in their own table
  for (const item of defaultCmsSavings) {
    const existing = await prisma.cmsSaving.findFirst({ where: { title: item.title }, select: { id: true } });
    if (!existing) {
      await prisma.cmsSaving.create({
        data: {
          title: item.title,
          description: item.description,
          features: item.features as Prisma.InputJsonValue,
          ctaLabel: item.ctaLabel,
          ctaPath: item.ctaPath,
          sortOrder: item.sortOrder,
          status: 'PUBLISHED',
        },
      });
    }
  }
};

const bootstrapCmsLoanProducts = async (): Promise<void> => {
  for (const item of defaultCmsLoanProducts) {
    const existing = await prisma.cmsLoanProduct.findFirst({
      where: { name: item.name },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsLoanProduct.create({
        data: {
          name: item.name,
          purpose: item.purpose,
          suited: item.suited,
          docs: item.docs,
          status: 'PUBLISHED',
          maxAmount: item.maxAmount,
          interestRate: item.interestRate,
          maxTerm: item.maxTerm,
          color: item.color,
          sortOrder: item.sortOrder,
        },
      });
    }
  }
};

const bootstrapCmsNews = async (): Promise<void> => {
  for (const item of defaultCmsNews) {
    const existing = await prisma.cmsNews.findFirst({
      where: { title: item.title },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsNews.create({
        data: {
          title: item.title,
          excerpt: item.excerpt,
          content: item.content,
          imageUrl: null,
          category: item.category,
          status: 'PUBLISHED',
        },
      });
    }
  }
};

const bootstrapCmsFaqs = async (): Promise<void> => {
  for (const item of defaultCmsFaqs) {
    const existing = await prisma.cmsFaq.findFirst({
      where: { question: item.question },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsFaq.create({
        data: {
          question: item.question,
          answer: item.answer,
          category: item.category,
          published: item.published,
        },
      });
    }
  }
};

const bootstrapCmsDownloads = async (): Promise<void> => {
  for (const category of defaultDownloadCategories) {
    const existing = await prisma.cmsDownloadCategory.findFirst({
      where: { name: category.name },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsDownloadCategory.create({
        data: {
          name: category.name,
          sortOrder: category.sortOrder,
          published: category.published,
        },
      });
    }
  }

  for (const file of defaultDownloadFiles) {
    const category = await prisma.cmsDownloadCategory.findFirst({
      where: { name: file.categoryName },
      select: { id: true },
    });
    if (!category) {
      continue;
    }

    const existing = await prisma.cmsDownloadFile.findFirst({
      where: { name: file.name },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsDownloadFile.create({
        data: {
          categoryId: category.id,
          name: file.name,
          size: file.size,
          type: file.type,
          link: file.link,
          sortOrder: file.sortOrder,
          published: file.published,
        },
      });
    }
  }
};

const bootstrapCmsBranches = async (): Promise<void> => {
  for (const branch of defaultCmsBranches) {
    const existing = await prisma.cmsBranch.findFirst({
      where: { name: branch.name },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsBranch.create({
        data: {
          name: branch.name,
          location: branch.location,
          officeHours: branch.officeHours,
          mapUrl: branch.mapUrl,
          phonePrimary: branch.phonePrimary,
          phoneSecondary: branch.phoneSecondary,
          published: branch.published,
        },
      });
    }
  }
};

const bootstrapCmsAnnouncements = async (): Promise<void> => {
  for (const announcement of defaultCmsAnnouncements) {
    const existing = await prisma.cmsAnnouncement.findFirst({
      where: { title: announcement.title },
      select: { id: true },
    });

    if (!existing) {
      await prisma.cmsAnnouncement.create({
        data: {
          title: announcement.title,
          content: announcement.content,
          type: announcement.type,
          status: announcement.status,
          startDate: new Date(announcement.startDate),
          endDate: announcement.endDate ? new Date(announcement.endDate) : null,
          placement: announcement.placement,
        },
      });
    }
  }
};

router.get('/faqs', authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsFaqs();

    const faqs = await prisma.cmsFaq.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({ faqs });
  } catch (error) {
    console.error('List faqs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/faqs', authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = faqCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid FAQ payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { question, answer, category, published } = parsed.data;

    const faq = await prisma.cmsFaq.create({
      data: {
        question,
        answer,
        category,
        published,
      },
    });

    res.status(201).json({ faq });
  } catch (error) {
    console.error('Create faq error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/faqs/:id', authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = faqUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid FAQ update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { question, answer, category, published } = parsed.data;

    const data: {
      question?: string;
      answer?: string;
      category?: string;
      published?: boolean;
    } = {};

    if (question !== undefined) {
      data.question = question;
    }
    if (answer !== undefined) {
      data.answer = answer;
    }
    if (category !== undefined) {
      data.category = category;
    }
    if (typeof published === 'boolean') {
      data.published = published;
    }

    const updated = await prisma.cmsFaq.updateMany({
      where: { id },
      data,
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'FAQ not found' });
      return;
    }

    const faq = await prisma.cmsFaq.findUnique({ where: { id } });
    res.json({ faq });
  } catch (error) {
    console.error('Update faq error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/faqs/:id', authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const deleted = await prisma.cmsFaq.deleteMany({ where: { id } });

    if (deleted.count === 0) {
      res.status(404).json({ error: 'FAQ not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete faq error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get(['/news', '/new'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsNews();

    const news = await prisma.cmsNews.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({ news });
  } catch (error) {
    console.error('List news error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/news', '/new'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = newsCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid news payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, excerpt, content, imageUrl, category, status } = parsed.data;

    const news = await prisma.cmsNews.create({
      data: {
        title,
        excerpt,
        content: content?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        category,
        status,
      },
    });

    res.status(201).json({ news });
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/news/upload-image', '/new/upload-image'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await runCmsNewsUpload(req, res);
    const uploaded = req.file;
    if (!uploaded) {
      res.status(400).json({ error: 'image is required' });
      return;
    }

    const imageUrl = `/uploads/cms-news/${uploaded.filename}`;
    res.status(201).json({ imageUrl });
  } catch (error) {
    console.error('Upload news image error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.toLowerCase().includes('invalid image type') || message.toLowerCase().includes('file too large')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/news/:id', '/new/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = newsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid news update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, excerpt, content, imageUrl, category, status } = parsed.data;

    const previous = await prisma.cmsNews.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!previous) {
      res.status(404).json({ error: 'News item not found' });
      return;
    }

    const data: {
      title?: string;
      excerpt?: string;
      content?: string | null;
      imageUrl?: string | null;
      category?: string;
      status?: string;
    } = {};

    if (title !== undefined) {
      data.title = title;
    }
    if (excerpt !== undefined) {
      data.excerpt = excerpt;
    }
    if (content !== undefined) {
      data.content = content;
    }
    if (imageUrl !== undefined) {
      data.imageUrl = imageUrl;
    }
    if (category !== undefined) {
      data.category = category;
    }
    if (status !== undefined) {
      data.status = status;
    }

    const news = await prisma.cmsNews.update({
      where: { id },
      data,
    });

    if (imageUrl && previous.imageUrl && previous.imageUrl !== imageUrl) {
      removeManagedNewsAsset(previous.imageUrl);
    }

    res.json({ news });
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/news/:id', '/new/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const previous = await prisma.cmsNews.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!previous) {
      res.status(404).json({ error: 'News item not found' });
      return;
    }

    await prisma.cmsNews.delete({ where: { id } });
    removeManagedNewsAsset(previous.imageUrl);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pages endpoints removed from admin API — CMS no longer manages standalone pages

router.get(['/downloads/categories', '/downloads/category'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsDownloads();

    const categories = await prisma.cmsDownloadCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ categories });
  } catch (error) {
    console.error('List download categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/downloads/categories', '/downloads/category'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = downloadCategoryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid download category payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { name, sortOrder, published } = parsed.data;

    const category = await prisma.cmsDownloadCategory.create({
      data: {
        name: name.trim(),
        sortOrder,
        published,
      },
    });

    res.status(201).json({ category });
  } catch (error) {
    console.error('Create download category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/downloads/categories/:id', '/downloads/category/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = downloadCategoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid download category update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { name, sortOrder, published } = parsed.data;

    const data: { name?: string; sortOrder?: number; published?: boolean } = {};
    if (name !== undefined) data.name = name;
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder;
    if (typeof published === 'boolean') data.published = published;

    const updated = await prisma.cmsDownloadCategory.updateMany({
      where: { id },
      data,
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const category = await prisma.cmsDownloadCategory.findUnique({ where: { id } });
    res.json({ category });
  } catch (error) {
    console.error('Update download category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/downloads/categories/:id', '/downloads/category/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    await prisma.cmsDownloadFile.deleteMany({
      where: {
        categoryId: id,
      },
    });
    const deleted = await prisma.cmsDownloadCategory.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete download category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get(['/downloads/files', '/downloads/file'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsDownloads();

    const files = await prisma.cmsDownloadFile.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ files });
  } catch (error) {
    console.error('List download files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/downloads/files/upload', '/downloads/file/upload'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await runCmsDownloadUpload(req, res);

    const uploadedFile = req.file;
    const parsedMeta = downloadUploadCreateSchema.safeParse(req.body);
    if (!parsedMeta.success) {
      if (uploadedFile) {
        removeManagedDownloadAsset(`/uploads/cms-downloads/${uploadedFile.filename}`);
      }
      sendValidationError(res, 'Invalid download upload payload', parseValidationError(parsedMeta.error.issues));
      return;
    }

    const categoryId = parsedMeta.data.categoryId;
    const name = parsedMeta.data.name || '';
    const sortOrder = parsedMeta.data.sortOrder;
    const published =
      typeof parsedMeta.data.published === 'boolean'
        ? parsedMeta.data.published
        : String(parsedMeta.data.published ?? 'true').toLowerCase() === 'true';

    if (!uploadedFile) {
      res.status(400).json({ error: 'file is required' });
      return;
    }

    if (!categoryId) {
      removeManagedDownloadAsset(`/uploads/cms-downloads/${uploadedFile.filename}`);
      res.status(400).json({ error: 'categoryId is required' });
      return;
    }

    const categoryExists = await prisma.cmsDownloadCategory.count({
      where: {
        id: categoryId,
      },
    });

    if (categoryExists === 0) {
      removeManagedDownloadAsset(`/uploads/cms-downloads/${uploadedFile.filename}`);
      res.status(404).json({ error: 'Download category not found' });
      return;
    }

    const link = `/uploads/cms-downloads/${uploadedFile.filename}`;

    const file = await prisma.cmsDownloadFile.create({
      data: {
        categoryId,
        name: name || path.parse(uploadedFile.originalname).name,
        size: formatFileSize(uploadedFile.size),
        type: parseFileType(uploadedFile),
        link,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        published,
      },
    });

    res.status(201).json({ file });
  } catch (error) {
    console.error('Upload download file error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.toLowerCase().includes('invalid file type') || message.toLowerCase().includes('file too large')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/downloads/files', '/downloads/file'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = downloadFileCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid download file payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { categoryId, name, size, type, link, sortOrder, published } = parsed.data;

    const file = await prisma.cmsDownloadFile.create({
      data: {
        categoryId,
        name: name.trim(),
        size,
        type,
        link,
        sortOrder,
        published,
      },
    });

    res.status(201).json({ file });
  } catch (error) {
    console.error('Create download file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/downloads/files/:id/upload', '/downloads/file/:id/upload'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    await runCmsDownloadUpload(req, res);

    const uploadedFile = req.file;
    if (!uploadedFile) {
      res.status(400).json({ error: 'file is required' });
      return;
    }

    const current = await prisma.cmsDownloadFile.findUnique({
      where: { id },
      select: { link: true },
    });

    if (!current) {
      removeManagedDownloadAsset(`/uploads/cms-downloads/${uploadedFile.filename}`);
      res.status(404).json({ error: 'Download file not found' });
      return;
    }

    const parsedMeta = downloadUploadUpdateSchema.safeParse(req.body);
    if (!parsedMeta.success) {
      removeManagedDownloadAsset(`/uploads/cms-downloads/${uploadedFile.filename}`);
      sendValidationError(res, 'Invalid download replacement payload', parseValidationError(parsedMeta.error.issues));
      return;
    }

    const categoryId = parsedMeta.data.categoryId ? parsedMeta.data.categoryId : null;
    const name = parsedMeta.data.name ? parsedMeta.data.name : null;
    const sortOrder = parsedMeta.data.sortOrder;
    const published =
      parsedMeta.data.published === undefined
        ? null
        : typeof parsedMeta.data.published === 'boolean'
          ? parsedMeta.data.published
          : String(parsedMeta.data.published).toLowerCase() === 'true';

    const link = `/uploads/cms-downloads/${uploadedFile.filename}`;

    const file = await prisma.cmsDownloadFile.update({
      where: { id },
      data: {
        categoryId: categoryId ?? undefined,
        name: name || path.parse(uploadedFile.originalname).name,
        size: formatFileSize(uploadedFile.size),
        type: parseFileType(uploadedFile),
        link,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
        published: published === null ? undefined : published,
      },
    });

    removeManagedDownloadAsset(current.link);
    res.json({ file });
  } catch (error) {
    console.error('Replace download file error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.toLowerCase().includes('invalid file type') || message.toLowerCase().includes('file too large')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/downloads/files/:id', '/downloads/file/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = downloadFileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid download file update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { categoryId, name, size, type, link, sortOrder, published } = parsed.data;

    const data: {
      categoryId?: string;
      name?: string;
      size?: string;
      type?: string;
      link?: string;
      sortOrder?: number;
      published?: boolean;
    } = {};

    if (categoryId !== undefined) data.categoryId = categoryId;
    if (name !== undefined) data.name = name;
    if (size !== undefined) data.size = size;
    if (type !== undefined) data.type = type;
    if (link !== undefined) data.link = link;
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder;
    if (typeof published === 'boolean') data.published = published;

    const updated = await prisma.cmsDownloadFile.updateMany({
      where: { id },
      data,
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Download file not found' });
      return;
    }

    const file = await prisma.cmsDownloadFile.findUnique({ where: { id } });
    res.json({ file });
  } catch (error) {
    console.error('Update download file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/downloads/files/:id', '/downloads/file/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const existing = await prisma.cmsDownloadFile.findUnique({
      where: { id },
      select: { link: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Download file not found' });
      return;
    }

    await prisma.cmsDownloadFile.delete({ where: { id } });
    removeManagedDownloadAsset(existing.link);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete download file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get(['/branches', '/branch'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsBranches();

    const branches = await prisma.cmsBranch.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ branches });
  } catch (error) {
    console.error('List cms branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/branches', '/branch'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = cmsBranchCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid branch payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { name, location, officeHours, mapUrl, phonePrimary, phoneSecondary, published } = parsed.data;

    const branch = await prisma.cmsBranch.create({
      data: {
        name,
        location,
        officeHours,
        mapUrl,
        phonePrimary: phonePrimary ?? null,
        phoneSecondary: phoneSecondary ?? null,
        published,
      },
    });

    await syncOperationalBranchFromCmsBranch(branch);

    res.status(201).json({ branch });
  } catch (error) {
    console.error('Create cms branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/branches/:id', '/branch/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = cmsBranchUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid branch update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { name, location, officeHours, mapUrl, phonePrimary, phoneSecondary, published } = parsed.data;

    const data: {
      name?: string;
      location?: string;
      officeHours?: string;
      mapUrl?: string;
      phonePrimary?: string | null;
      phoneSecondary?: string | null;
      published?: boolean;
    } = {};

    if (name !== undefined) data.name = name;
    if (location !== undefined) data.location = location;
    if (officeHours !== undefined) data.officeHours = officeHours;
    if (mapUrl !== undefined) data.mapUrl = mapUrl;
    if (phonePrimary !== undefined) data.phonePrimary = phonePrimary;
    if (phoneSecondary !== undefined) data.phoneSecondary = phoneSecondary;
    if (typeof published === 'boolean') data.published = published;

    const updated = await prisma.cmsBranch.updateMany({
      where: { id },
      data,
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    const branch = await prisma.cmsBranch.findUnique({ where: { id } });
    if (branch) {
      await syncOperationalBranchFromCmsBranch(branch);
    }
    res.json({ branch });
  } catch (error) {
    console.error('Update cms branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/branches/:id', '/branch/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const deleted = await prisma.cmsBranch.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    await removeOperationalBranchFromCmsBranch(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete cms branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get(['/services', '/service'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsServices();

    const services = await prisma.cmsService.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    res.json({ services: services.map((service) => ({ ...service, features: normalizeServiceFeatures(service.features) })) });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/services', '/service'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = cmsServiceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid service payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, description, features, ctaLabel, ctaPath, sortOrder, status } = parsed.data;

    const featureList = normalizeServiceFeatures(features);

    const service = await prisma.cmsService.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        features: featureList as Prisma.InputJsonValue,
        ctaLabel: ctaLabel?.trim() || null,
        ctaPath: ctaPath?.trim() || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        status,
      },
    });

    res.status(201).json({ service: { ...service, features: normalizeServiceFeatures(service.features) } });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/services/:id', '/service/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = cmsServiceUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid service update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, description, features, ctaLabel, ctaPath, sortOrder, status } = parsed.data;

    const existing = await prisma.cmsService.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    const featureList = normalizeServiceFeatures(features);

    const data: {
      title?: string;
      description?: string;
      features?: Prisma.InputJsonValue;
      ctaLabel?: string | null;
      ctaPath?: string | null;
      sortOrder?: number;
      status?: string;
    } = {};

    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (features !== undefined) data.features = featureList as Prisma.InputJsonValue;
    if (ctaLabel !== undefined) data.ctaLabel = ctaLabel?.trim() || null;
    if (ctaPath !== undefined) data.ctaPath = ctaPath?.trim() || null;
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder;
    if (status !== undefined) data.status = status.trim();

    const service = await prisma.cmsService.update({
      where: { id },
      data,
    });

    res.json({ service: { ...service, features: normalizeServiceFeatures(service.features) } });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/services/:id', '/service/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const deleted = await prisma.cmsService.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CMS Savings admin endpoints
router.get(['/savings', '/saving'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const savings = await prisma.cmsSaving.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    res.json({ savings: savings.map((s) => ({ ...s, features: normalizeServiceFeatures(s.features) })) });
  } catch (error) {
    console.error('List savings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/savings', '/saving'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = cmsSavingCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid saving payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, description, features, ctaLabel, ctaPath, sortOrder, status } = parsed.data;

    const featureList = normalizeServiceFeatures(features);

    const saving = await prisma.cmsSaving.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        features: featureList as Prisma.InputJsonValue,
        ctaLabel: ctaLabel?.trim() || null,
        ctaPath: ctaPath?.trim() || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        status,
      },
    });

    res.status(201).json({ saving: { ...saving, features: normalizeServiceFeatures(saving.features) } });
  } catch (error) {
    console.error('Create saving error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/savings/:id', '/saving/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = cmsSavingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid saving update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, description, features, ctaLabel, ctaPath, sortOrder, status } = parsed.data;

    const existing = await prisma.cmsSaving.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      res.status(404).json({ error: 'Saving not found' });
      return;
    }

    const featureList = normalizeServiceFeatures(features);

    const data: {
      title?: string;
      description?: string;
      features?: Prisma.InputJsonValue;
      ctaLabel?: string | null;
      ctaPath?: string | null;
      sortOrder?: number;
      status?: string;
    } = {};

    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (features !== undefined) data.features = featureList as Prisma.InputJsonValue;
    if (ctaLabel !== undefined) data.ctaLabel = ctaLabel?.trim() || null;
    if (ctaPath !== undefined) data.ctaPath = ctaPath?.trim() || null;
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder;
    if (status !== undefined) data.status = status.trim();

    const saving = await prisma.cmsSaving.update({ where: { id }, data });

    res.json({ saving: { ...saving, features: normalizeServiceFeatures(saving.features) } });
  } catch (error) {
    console.error('Update saving error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/savings/:id', '/saving/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const deleted = await prisma.cmsSaving.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Saving not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete saving error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get(['/loan-products', '/loan-product'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsLoanProducts();

    const loanProducts = await prisma.cmsLoanProduct.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    res.json({ loanProducts });
  } catch (error) {
    console.error('List loan products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/loan-products', '/loan-product'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = loanProductCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid loan product payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { name, purpose, suited, docs, status, maxAmount, interestRate, maxTerm, color, sortOrder } = parsed.data;

    const loanProduct = await prisma.cmsLoanProduct.create({
      data: {
        name: name.trim(),
        purpose: purpose.trim(),
        suited: suited.trim(),
        docs: docs.trim(),
        status,
        maxAmount: maxAmount.trim(),
        interestRate: interestRate.trim(),
        maxTerm: maxTerm.trim(),
        color,
        sortOrder,
      },
    });

    res.status(201).json({ loanProduct });
  } catch (error) {
    console.error('Create loan product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/loan-products/:id', '/loan-product/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = loanProductUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid loan product update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { name, purpose, suited, docs, status, maxAmount, interestRate, maxTerm, color, sortOrder } = parsed.data;

    const data: {
      name?: string;
      purpose?: string;
      suited?: string;
      docs?: string;
      status?: string;
      maxAmount?: string;
      interestRate?: string;
      maxTerm?: string;
      color?: string;
      sortOrder?: number;
    } = {};

    if (name !== undefined) data.name = name;
    if (purpose !== undefined) data.purpose = purpose;
    if (suited !== undefined) data.suited = suited;
    if (docs !== undefined) data.docs = docs;
    if (status !== undefined) data.status = status;
    if (maxAmount !== undefined) data.maxAmount = maxAmount;
    if (interestRate !== undefined) data.interestRate = interestRate;
    if (maxTerm !== undefined) data.maxTerm = maxTerm;
    if (color !== undefined) data.color = color;
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder;

    const updated = await prisma.cmsLoanProduct.updateMany({
      where: { id },
      data,
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Loan product not found' });
      return;
    }

    const loanProduct = await prisma.cmsLoanProduct.findUnique({ where: { id } });
    res.json({ loanProduct });
  } catch (error) {
    console.error('Update loan product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/loan-products/:id', '/loan-product/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const deleted = await prisma.cmsLoanProduct.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Loan product not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete loan product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get(['/announcements', '/announcement'], authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await bootstrapCmsAnnouncements();

    // Exclude banner placements from the admin announcement listing
    const BANNER_PLACEMENTS = ['Banner Top', 'Homepage Above News', 'Downloads Banner', 'Loans Banner', 'Banner Bottom'];
    const announcements = await prisma.cmsAnnouncement.findMany({
      where: { NOT: { placement: { in: BANNER_PLACEMENTS } } },
      orderBy: [{ startDate: 'desc' }, { updatedAt: 'desc' }],
    });

    res.json({ announcements });
  } catch (error) {
    console.error('List announcements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/content/announcements/cleanup-banners
router.post('/announcements/cleanup-banners', authenticate, authorize(...cmsRoles), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const BANNER_PLACEMENTS = ['Banner Top', 'Homepage Above News', 'Downloads Banner', 'Loans Banner', 'Banner Bottom'];
    const deleted = await prisma.cmsAnnouncement.deleteMany({ where: { placement: { in: BANNER_PLACEMENTS } } });
    res.json({ deletedCount: deleted.count });
  } catch (error) {
    console.error('Cleanup banner announcements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(['/announcements', '/announcement'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = announcementCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid announcement payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, content, type, status, startDate, endDate, placement } = parsed.data;
    const normalizedEndDate = endDate?.trim() ? endDate.trim() : null;

    const announcement = await prisma.cmsAnnouncement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        type,
        status,
        startDate: new Date(startDate),
        endDate: normalizedEndDate ? new Date(normalizedEndDate) : null,
        placement,
      },
    });

    res.status(201).json({ announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(['/announcements/:id', '/announcement/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const parsed = announcementUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, 'Invalid announcement update payload', parseValidationError(parsed.error.issues));
      return;
    }

    const { title, content, type, status, startDate, endDate, placement } = parsed.data;

    const data: {
      title?: string;
      content?: string;
      type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date | null;
      placement?: string;
    } = {};

    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) {
      const trimmed = endDate.trim();
      data.endDate = trimmed ? new Date(trimmed) : null;
    }
    if (placement !== undefined) data.placement = placement;

    const updated = await prisma.cmsAnnouncement.updateMany({
      where: { id },
      data,
    });

    if (updated.count === 0) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    const announcement = await prisma.cmsAnnouncement.findUnique({ where: { id } });
    res.json({ announcement });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete(['/announcements/:id', '/announcement/:id'], authenticate, authorize(...cmsRoles), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = resolveParamId(req.params.id);
    const deleted = await prisma.cmsAnnouncement.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
