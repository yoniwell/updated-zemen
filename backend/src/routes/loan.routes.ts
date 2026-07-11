import { Router, Response } from 'express';
import { ApplicationStatus } from '@prisma/client';
import prisma from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateReferenceNo } from '../utils/reference';
import { resolveBranchIdFromInput } from '../utils/branch-resolution';
import { consumePortalOtpVerificationToken, PortalOtpError } from '../services/public-otp.service';
import { buildLoanApprovedTemplate, buildLoanSubmittedTemplate, sendNotification } from '../services/notification.service';

const router = Router();

const paramToString = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

const statusTransitionMap: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'PENDING_DOCUMENTS', 'REJECTED'],
  UNDER_REVIEW: ['KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED'],
  KYC_VERIFICATION: ['UNDER_REVIEW', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED'],
  PENDING_DOCUMENTS: ['UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_CLARIFICATION', 'REJECTED'],
  PENDING_CLARIFICATION: ['UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'REJECTED'],
  APPROVED: ['ACTIVATED'],
  REJECTED: [],
  ACTIVATED: [],
};

const isValidStatus = (status: string): status is ApplicationStatus =>
  (Object.values(ApplicationStatus) as string[]).includes(status);
const canTransition = (fromStatus: string, toStatus: string) =>
  statusTransitionMap[fromStatus]?.includes(toStatus) ?? false;

const buildApplicantName = (firstName: string, middleName?: string | null, lastName?: string | null): string =>
  [firstName, middleName || '', lastName || ''].map((part) => part.trim()).filter(Boolean).join(' ');

// GET /api/loans/branches - List operational branches for public portal forms
router.get('/branches', async (_req, res: Response): Promise<void> => {
  try {
    const branches = await prisma.branch.findMany({
      where: { status: 'OPERATIONAL' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    res.json({ branches });
  } catch (error) {
    console.error('List public loan branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/loans - Create new loan application
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      membershipNo, firstName, middleName, lastName, email,
      loanType, amount, tenure, purpose, repaymentSource,
      occupation, employer, maritalStatus, registeredMobile, idType,
      collateralType, collateralDesc,
      branchId, preferredBranch, termsAccepted, creditConsent, signature,
      otpVerificationToken,
    } = req.body;
    const phone = req.body.phone || req.body.registeredMobile;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    if (!otpVerificationToken || typeof otpVerificationToken !== 'string') {
      res.status(401).json({ error: 'OTP verification is required before submitting.' });
      return;
    }
    console.log("=== DEBUGGING OTP ONSUBMIT ===");
    console.log("Payload Email Received:", email);
    console.log("Payload Token Received:", otpVerificationToken);

    try {
      await consumePortalOtpVerificationToken({
        purpose: 'loan',
        email,
        verificationToken: otpVerificationToken,
      });
    } catch (error) {
      if (error instanceof PortalOtpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      throw error;
    }

    if (!firstName || !lastName || !phone) {
      res.status(400).json({ error: 'First name, last name, and phone are required' });
      return;
    }

    // Find or create applicant
    let applicant = await prisma.applicant.findUnique({ where: { phone } });
    if (!applicant) {
      applicant = await prisma.applicant.create({
        data: { firstName, middleName, lastName, phone, email },
      });
    }

    const referenceNo = generateReferenceNo('loan');

    // 1. FIXED: Sanitize inputs and explicitly exclude literal "undefined" or "null" string variables
    let resolvedBranchId: string | null = null;
    if (typeof branchId === 'string' && branchId.trim() !== '' && branchId !== 'undefined' && branchId !== 'null') {
      resolvedBranchId = branchId.trim();
    }

    // 2. Fall back to preferredBranch lookup if branchId wasn't passed directly
    if (!resolvedBranchId && typeof preferredBranch === 'string' && preferredBranch.trim() && preferredBranch !== 'undefined') {
      const resolved = await resolveBranchIdFromInput(preferredBranch);
      resolvedBranchId = resolved || null;
    }

    // 3. CRITICAL SECURITY CHECK: Verify the branch ID actually exists in your database
    if (resolvedBranchId) {
      const branchExists = await prisma.branch.findUnique({
        where: { id: resolvedBranchId },
      });

      // If the ID is a broken string or doesn't match an actual branch, block it early
      if (!branchExists) {
        res.status(400).json({ error: 'Selected branch is invalid or does not exist.' });
        return;
      }
    }

    const application = await prisma.loanApplication.create({
      data: {
        referenceNo,
        applicantId: applicant.id,
        membershipNo,
        status: termsAccepted ? 'SUBMITTED' : 'DRAFT',
        loanType, amount, tenure, purpose, repaymentSource,
        occupation, employer, maritalStatus, registeredMobile, idType,
        collateralType, collateralDesc,

        // FIXED: Maps to null if no valid branch is resolved, avoiding P2003 constraints
        branchId: resolvedBranchId || undefined,

        termsAccepted: termsAccepted || false,
        creditConsent: creditConsent || false,
        signature,
        submittedAt: termsAccepted ? new Date() : undefined,
      },
      include: { applicant: true, branch: true },
    });


    if (application.status === 'SUBMITTED' && application.applicant.email) {
      const submittedMessage = buildLoanSubmittedTemplate(
        buildApplicantName(application.applicant.firstName, application.applicant.middleName, application.applicant.lastName),
        application.referenceNo
      );
      void sendNotification({
        to: application.applicant.email,
        channel: 'EMAIL',
        subject: submittedMessage.subject,
        message: submittedMessage.message,
      });
    }

    res.status(201).json({ application });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/loans - List all loan applications (admin)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      loanType,
      branchId,
      branchName,
      assignedToId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '10',
    } = req.query;
    const parsedPage = Math.max(1, parseInt(String(page), 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const skip = (parsedPage - 1) * parsedLimit;

    const where: Record<string, unknown> = {};
    const normalizedStatus = String(status || '').trim();
    if (normalizedStatus) {
      const statusValues = normalizedStatus.split(',').map((item) => item.trim()).filter(Boolean);
      if (statusValues.length > 1) {
        where.status = { in: statusValues };
      } else if (statusValues.length === 1) {
        where.status = statusValues[0];
      }
    }
    if (loanType) where.loanType = loanType;
    if (branchId) where.branchId = branchId;
    if (branchName) where.branch = { name: String(branchName) };
    if (assignedToId) where.assignedToId = assignedToId;
    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { referenceNo: { contains: normalizedSearch } },
        { membershipNo: { contains: normalizedSearch } },
        {
          applicant: {
            OR: [
              { firstName: { contains: normalizedSearch } },
              { middleName: { contains: normalizedSearch } },
              { lastName: { contains: normalizedSearch } },
              { phone: { contains: normalizedSearch } },
            ],
          },
        },
      ];
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'submittedAt', 'status', 'referenceNo', 'amount', 'loanType'] as const;
    const orderField = allowedSortFields.includes(String(sortBy) as (typeof allowedSortFields)[number])
      ? (String(sortBy) as (typeof allowedSortFields)[number])
      : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [applications, total] = await Promise.all([
      prisma.loanApplication.findMany({
        where,
        include: {
          applicant: true,
          branch: true,
          assignedTo: { select: { id: true, name: true } },
          documents: { select: { id: true, category: true, status: true } },
        },
        orderBy: { [orderField]: orderDirection },
        skip,
        take: parsedLimit,
      }),
      prisma.loanApplication.count({ where }),
    ]);

    res.json({
      applications,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
      },
    });
  } catch (error) {
    console.error('List loans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/loans/:id - Get single loan application
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);

    const application = await prisma.loanApplication.findUnique({
      where: { id },
      include: {
        applicant: true,
        branch: true,
        assignedTo: { select: { id: true, name: true } },
        documents: true,
        notes: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        workflow: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    res.json({ application });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// PATCH /api/loans/:id/status - Update loan status (admin)
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'LOAN_OFFICER', 'BRANCH_MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);
    const { note } = req.body;
    const statusValue = typeof req.body.status === 'string' ? req.body.status : null;

    if (!statusValue || !isValidStatus(statusValue)) {
      res.status(400).json({ error: 'Valid status is required' });
      return;
    }

    const status: ApplicationStatus = statusValue;

    const application = await prisma.loanApplication.findUnique({ where: { id }, include: { applicant: true } });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (!canTransition(application.status, status)) {
      res.status(400).json({
        error: `Invalid transition from ${application.status} to ${status}`,
        allowedNextStatuses: statusTransitionMap[application.status] || [],
      });
      return;
    }

    const updated = await prisma.loanApplication.update({
      where: { id },
      data: {
        status,
        reviewedAt: ['APPROVED', 'REJECTED'].includes(status) ? new Date() : undefined,
      },
    });

    await prisma.workflowHistory.create({
      data: {
        fromStatus: application.status,
        toStatus: status,
        note,
        changedById: req.user!.id,
        loanApplicationId: application.id,
      },
    });

    if (status === 'APPROVED' && application.applicant.email) {
      const approvedMessage = buildLoanApprovedTemplate(
        buildApplicantName(application.applicant.firstName, application.applicant.middleName, application.applicant.lastName)
      );
      void sendNotification({
        to: application.applicant.email,
        channel: 'EMAIL',
        subject: approvedMessage.subject,
        message: approvedMessage.message,
      });
    }

    res.json({ application: updated });
  } catch (error) {
    console.error('Update loan status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/loans/:id/assign - Assign officer
router.patch('/:id/assign', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);
    const { assignedToId } = req.body;
    const updated = await prisma.loanApplication.update({
      where: { id },
      data: { assignedToId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    res.json({ application: updated });
  } catch (error) {
    console.error('Assign loan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/loans/:id - Update loan profile details (admin)
router.patch('/:id', authenticate, authorize('SUPER_ADMIN', 'LOAN_OFFICER', 'BRANCH_MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);
    const {
      firstName,
      middleName,
      lastName,
      phone,
      email,
      membershipNo,
      loanType,
      amount,
      tenure,
      purpose,
      repaymentSource,
      occupation,
      employer,
      maritalStatus,
      registeredMobile,
      idType,
      collateralType,
      collateralDesc,
      termsAccepted,
      creditConsent,
      signature,
      preferredBranch,
      status,
      note,
    } = req.body;

    if (!firstName || !lastName || !phone) {
      res.status(400).json({ error: 'First name, last name, and phone are required' });
      return;
    }

    const existing = await prisma.loanApplication.findUnique({
      where: { id },
      include: { applicant: true, branch: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    let nextStatus: ApplicationStatus | undefined;
    if (typeof status === 'string' && status.length > 0 && status !== existing.status) {
      if (!isValidStatus(status)) {
        res.status(400).json({ error: 'Valid status is required' });
        return;
      }
      if (!canTransition(existing.status, status)) {
        res.status(400).json({
          error: `Invalid transition from ${existing.status} to ${status}`,
          allowedNextStatuses: statusTransitionMap[existing.status] || [],
        });
        return;
      }
      nextStatus = status;
    }

    let resolvedBranchId: string | null | undefined = existing.branchId;
    if (typeof preferredBranch === 'string') {
      const preferredBranchText = preferredBranch.trim();
      if (!preferredBranchText) {
        resolvedBranchId = null;
      } else {
        const matchedBranchId = await resolveBranchIdFromInput(preferredBranchText);
        if (!matchedBranchId) {
          res.status(400).json({ error: 'Preferred branch not found' });
          return;
        }

        resolvedBranchId = matchedBranchId;
      }
    }

    await prisma.applicant.update({
      where: { id: existing.applicantId },
      data: {
        firstName,
        middleName,
        lastName,
        phone,
        email,
      },
    });

    const updated = await prisma.loanApplication.update({
      where: { id },
      data: {
        membershipNo,
        loanType,
        amount,
        tenure,
        purpose,
        repaymentSource,
        occupation,
        employer,
        maritalStatus,
        registeredMobile,
        idType,
        collateralType,
        collateralDesc,
        termsAccepted: typeof termsAccepted === 'boolean' ? termsAccepted : existing.termsAccepted,
        creditConsent: typeof creditConsent === 'boolean' ? creditConsent : existing.creditConsent,
        signature,
        branchId: resolvedBranchId,
        status: nextStatus,
        reviewedAt: nextStatus && ['APPROVED', 'REJECTED'].includes(nextStatus) ? new Date() : undefined,
      },
      include: { applicant: true, branch: true, assignedTo: { select: { id: true, name: true } }, documents: true },
    });

    if (nextStatus) {
      await prisma.workflowHistory.create({
        data: {
          fromStatus: existing.status,
          toStatus: nextStatus,
          note,
          changedById: req.user!.id,
          loanApplicationId: existing.id,
        },
      });
    }

    res.json({ application: updated });
  } catch (error) {
    console.error('Update loan profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
