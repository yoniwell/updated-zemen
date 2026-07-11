import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import fs from 'fs';
import { z } from 'zod';
import { upload, validateUploadedFileSignature, scanUploadedFile } from '../middleware/upload';
import { recordSecurityEvent } from '../services/security-monitor.service';
import { sendNotification } from '../services/notification.service';
import {
  issuePortalOtp,
  PortalOtpError,
  PortalOtpPurpose,
  verifyPortalOtpCode,
} from '../services/public-otp.service';

const router = Router();

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]);
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const paramToString = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

const documentCategories = [
  'NATIONAL_ID_FRONT',
  'NATIONAL_ID_BACK',
  'PASSPORT',
  'APPLICANT_PHOTO',
  'FILLED_FORM',
  'MEMBERSHIP_PAYMENT_PROOF',
  'SAVING_PAYMENT_PROOF',
  'PROOF_OF_ADDRESS',
  'BANK_STATEMENT',
  'PAYSLIP',
  'BUSINESS_LICENSE',
  'GUARANTOR_ID',
  'COLLATERAL_DOC',
  'LOAN_APPLICATION_LETTER',
  'LOAN_REQUEST_FORM',
  'PERSONAL_PHOTO',
  'ID_FRONT_PHOTO',
  'ID_BACK_PHOTO',
  'MARRIAGE_CERTIFICATE',
  'COLLATERAL_DOCUMENT',
  'BUSINESS_PLAN',
  'OTHER',
] as const;

const membershipDraftFields = [
  'occupation',
  'employer',
  'incomeRange',
  'branchId',
  'membershipProduct',
  'emergencyContactName',
  'emergencyContactPhone',
  'termsAccepted',
  'privacyAccepted',
  'signature',
  'status',
];

const loanDraftFields = [
  'membershipNo',
  'loanType',
  'amount',
  'tenure',
  'purpose',
  'repaymentSource',
  'occupation',
  'employer',
  'maritalStatus',
  'registeredMobile',
  'idType',
  'collateralType',
  'collateralDesc',
  'branchId',
  'termsAccepted',
  'creditConsent',
  'signature',
  'status',
];

const statusLookupParamSchema = z.object({
  referenceNo: z
    .string()
    .trim()
    .min(6)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/, 'Reference number format is invalid'),
});

const otpSendSchema = z.object({
  email: z.string().trim().email(),
  purpose: z.enum(['membership', 'loan']),
  resend: z.boolean().optional(),
});

const otpVerifySchema = z.object({
  email: z.string().trim().email(),
  purpose: z.enum(['membership', 'loan']),
  code: z.string().trim().min(4).max(8),
});

function pickDraftFields<T extends Record<string, unknown>>(
  payload: T,
  allowed: string[]
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      data[key] = payload[key];
    }
  }
  return data;
}

async function findApplicationById(id: string): Promise<{
  applicationType: 'membership' | 'loan';
  record: { id: string };
} | null> {
  const membership = await prisma.membershipApplication.findUnique({ where: { id } });
  if (membership) {
    return { applicationType: 'membership', record: membership };
  }

  const loan = await prisma.loanApplication.findUnique({ where: { id } });
  if (loan) {
    return { applicationType: 'loan', record: loan };
  }

  return null;
}

const findApplicantByEmail = async (email: string) => {
  return prisma.applicant.findFirst({
    where: {
      email: {
        equals: email,
      },
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  });
};

const buildPortalOtpMessage = (code: string): string => {
  return `Your Zemen SACCO verification code is ${code}.\n\nThis code will expire in 2 minutes. If you did not request this, please ignore this email.`;
};

// POST /api/applications/otp/send
router.post('/otp/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = otpSendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid OTP request payload', details: parsed.error.issues });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const purpose = parsed.data.purpose as PortalOtpPurpose;

    const applicant = await findApplicantByEmail(email);
    if (purpose === 'loan' && !applicant) {
      res.status(404).json({ error: 'No user found with this email for loan application.' });
      return;
    }

    const { code, expiresInSeconds, resendInSeconds } = await issuePortalOtp({
      purpose,
      email,
      forceResend: parsed.data.resend === true,
    });

    const emailResult = await sendNotification({
      to: email,
      channel: 'EMAIL',
      subject: 'Your Verification Code',
      message: buildPortalOtpMessage(code),
    });

    if (!emailResult.queued) {
      res.status(500).json({ error: 'Failed to send verification code email.' });
      return;
    }

    res.json({
      sent: true,
      expiresInSeconds,
      resendInSeconds,
      existingUser: Boolean(applicant),
      applicant,
    });
  } catch (error) {
    if (error instanceof PortalOtpError) {
      res.status(error.status).json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds });
      return;
    }

    console.error('OTP send error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/applications/otp/verify
router.post('/otp/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = otpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid OTP verify payload', details: parsed.error.issues });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const purpose = parsed.data.purpose as PortalOtpPurpose;

    const applicant = await findApplicantByEmail(email);
    if (purpose === 'loan' && !applicant) {
      res.status(404).json({ error: 'No user found with this email for loan application.' });
      return;
    }

    const verified = await verifyPortalOtpCode({
      purpose,
      email,
      code: parsed.data.code,
    });

    res.json({
      verified: true,
      verificationToken: verified.verificationToken,
      existingUser: Boolean(applicant),
      applicant,
    });
  } catch (error) {
    if (error instanceof PortalOtpError) {
      res.status(error.status).json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds });
      return;
    }

    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/applications/:id/upload
router.post('/:id/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { category } = req.body;
    const normalizedCategory = Array.isArray(category) ? category[0] : category;

    if (!req.file) {
      res.status(400).json({ error: 'File is required (multipart field name: file)' });
      return;
    }

    if (!normalizedCategory || !documentCategories.includes(normalizedCategory as (typeof documentCategories)[number])) {
      res.status(400).json({ error: 'Valid document category is required' });
      return;
    }

    const app = await findApplicationById(id);
    if (!app) {
      if (req.file?.path) {
        await fs.promises.unlink(req.file.path).catch(() => undefined);
      }
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const hasValidSignature = await validateUploadedFileSignature(req.file.path, req.file.mimetype);
    if (!hasValidSignature) {
      await fs.promises.unlink(req.file.path).catch(() => undefined);
      await recordSecurityEvent({
        endpoint: 'upload',
        eventType: 'UPLOAD_SIGNATURE_REJECTED',
        ipAddress: getClientIp(req),
        details: `applicationId=${id}; mimeType=${req.file.mimetype}`,
      });
      res.status(400).json({ error: 'Uploaded file content does not match the declared file type' });
      return;
    }

    const scanResult = await scanUploadedFile(req.file.path);
    if (!scanResult.clean) {
      await fs.promises.unlink(req.file.path).catch(() => undefined);
      await recordSecurityEvent({
        endpoint: 'upload',
        eventType: 'UPLOAD_MALWARE_REJECTED',
        ipAddress: getClientIp(req),
        details: scanResult.details || `applicationId=${id}`,
      });
      res.status(400).json({ error: 'Upload blocked by security scan', details: scanResult.details });
      return;
    }

    const document = await prisma.document.create({
      data: {
        category: normalizedCategory,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        membershipApplicationId: app.applicationType === 'membership' ? id : undefined,
        loanApplicationId: app.applicationType === 'loan' ? id : undefined,
      },
    });

    res.status(201).json({ document });
  } catch (error) {
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => undefined);
    }
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/applications/status/:referenceNo
router.get('/status/:referenceNo', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedParams = statusLookupParamSchema.safeParse({
      referenceNo: paramToString(req.params.referenceNo),
    });

    if (!parsedParams.success) {
      await recordSecurityEvent({
        endpoint: 'status-lookup',
        eventType: 'STATUS_LOOKUP_INVALID_INPUT',
        ipAddress: getClientIp(req),
      });
      res.status(400).json({ error: 'Invalid reference number', details: parsedParams.error.issues });
      return;
    }

    const referenceNo = parsedParams.data.referenceNo;

    const membership = await prisma.membershipApplication.findUnique({
      where: { referenceNo },
      select: {
        id: true,
        referenceNo: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        updatedAt: true,
      },
    });

    if (membership) {
      res.json({ applicationType: 'membership', application: membership });
      return;
    }

    const loan = await prisma.loanApplication.findUnique({
      where: { referenceNo },
      select: {
        id: true,
        referenceNo: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        updatedAt: true,
      },
    });

    if (loan) {
      res.json({ applicationType: 'loan', application: loan });
      return;
    }

    res.status(404).json({ error: 'Application not found' });
  } catch (error) {
    console.error('Track status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/applications/:applicationType/:id/draft
router.patch('/:applicationType/:id/draft', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    if (applicationType === 'membership') {
      const existing = await prisma.membershipApplication.findUnique({
        where: { id },
        include: { applicant: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Membership application not found' });
        return;
      }

      const appData = pickDraftFields(
        { ...req.body, status: 'DRAFT' },
        membershipDraftFields as string[]
      );

      const applicantData = pickDraftFields(req.body.applicant ?? {}, [
        'firstName',
        'middleName',
        'lastName',
        'dob',
        'gender',
        'nationality',
        'phone',
        'email',
        'region',
        'city',
        'subCity',
        'woreda',
        'address',
        'idType',
        'idNumber',
      ]);

      const updated = await prisma.membershipApplication.update({
        where: { id },
        data: {
          ...appData,
          applicant: Object.keys(applicantData).length
            ? {
                update: {
                  ...applicantData,
                  dob: applicantData.dob ? new Date(String(applicantData.dob)) : undefined,
                },
              }
            : undefined,
        },
        include: { applicant: true, branch: true, documents: true },
      });

      res.json({ application: updated });
      return;
    }

    if (applicationType === 'loan') {
      const existing = await prisma.loanApplication.findUnique({
        where: { id },
        include: { applicant: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Loan application not found' });
        return;
      }

      const appData = pickDraftFields(
        { ...req.body, status: 'DRAFT' },
        loanDraftFields as string[]
      );

      const applicantData = pickDraftFields(req.body.applicant ?? {}, [
        'firstName',
        'middleName',
        'lastName',
        'phone',
        'email',
      ]);

      const updated = await prisma.loanApplication.update({
        where: { id },
        data: {
          ...appData,
          applicant: Object.keys(applicantData).length
            ? {
                update: applicantData,
              }
            : undefined,
        },
        include: { applicant: true, branch: true, documents: true },
      });

      res.json({ application: updated });
      return;
    }

    res.status(400).json({ error: 'applicationType must be membership or loan' });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/applications/:applicationType/:id/draft
router.get('/:applicationType/:id/draft', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationType = paramToString(req.params.applicationType);
    const id = paramToString(req.params.id);

    if (applicationType === 'membership') {
      const application = await prisma.membershipApplication.findUnique({
        where: { id },
        include: { applicant: true, branch: true, documents: true },
      });

      if (!application) {
        res.status(404).json({ error: 'Membership application not found' });
        return;
      }

      res.json({ application });
      return;
    }

    if (applicationType === 'loan') {
      const application = await prisma.loanApplication.findUnique({
        where: { id },
        include: { applicant: true, branch: true, documents: true },
      });

      if (!application) {
        res.status(404).json({ error: 'Loan application not found' });
        return;
      }

      res.json({ application });
      return;
    }

    res.status(400).json({ error: 'applicationType must be membership or loan' });
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
