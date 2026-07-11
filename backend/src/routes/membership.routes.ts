import { Router, Response } from 'express';
import { ApplicationStatus } from '@prisma/client';
import prisma from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generateReferenceNo } from '../utils/reference';
import { resolveBranchIdFromInput } from '../utils/branch-resolution';
import { consumePortalOtpVerificationToken, PortalOtpError } from '../services/public-otp.service';
import {
  buildMembershipApprovedTemplate,
  buildMembershipSubmittedTemplate,
  sendNotification,
} from '../services/notification.service';

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

const resolveMembershipNameParts = (body: Record<string, unknown>) => {
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const middleName = typeof body.middleName === 'string'
    ? body.middleName.trim()
    : typeof body.fathersName === 'string'
      ? body.fathersName.trim()
      : '';
  const lastName = typeof body.lastName === 'string'
    ? body.lastName.trim()
    : typeof body.grandfathersName === 'string'
      ? body.grandfathersName.trim()
      : '';

  return { firstName, middleName, lastName };
};

// GET /api/membership/branches - List operational branches for public portal forms
router.get('/branches', async (_req, res: Response): Promise<void> => {
  try {
    const branches = await prisma.branch.findMany({
      where: { status: 'OPERATIONAL' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    res.json({ branches });
  } catch (error) {
    console.error('List public membership branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/membership - Create new membership application
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      phone, email,
      dob, gender, nationality, region, city, subCity, woreda, address,
      idType, idNumber, applicantType,
      occupation, employer, incomeRange,
      branchId, preferredBranch, membershipProduct,
      membershipPaymentAmount, savingType, savingPaymentAmount, savingTransactionRef,
      emergencyContactName, emergencyContactPhone,
      termsAccepted, privacyAccepted, signature,
      otpVerificationToken,
    } = req.body;

    const { firstName, middleName, lastName } = resolveMembershipNameParts(req.body);

    if (!firstName || !lastName || !phone || !email) {
      res.status(400).json({ error: 'First name, last name, phone, and email are required' });
      return;
    }

    if (!otpVerificationToken || typeof otpVerificationToken !== 'string') {
      res.status(401).json({ error: 'OTP verification is required before submitting.' });
      return;
    }

    try {
      await consumePortalOtpVerificationToken({
        purpose: 'membership',
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
        data: {
          firstName, middleName, lastName, phone, email,
          dob: dob ? new Date(dob) : undefined,
          gender, nationality, region, city, subCity, woreda, address,
          idType, idNumber,
        },
      });
    }

    const referenceNo = generateReferenceNo('membership');

    const branchIdInput = typeof branchId === 'string' ? branchId.trim() : '';
    const preferredBranchInput = typeof preferredBranch === 'string' ? preferredBranch.trim() : '';

    let resolvedBranchId: string | undefined;
    if (branchIdInput) {
      const existingBranch = await prisma.branch.findUnique({
        where: { id: branchIdInput },
        select: { id: true },
      });

      if (existingBranch) {
        resolvedBranchId = existingBranch.id;
      }
    }

    if (!resolvedBranchId && preferredBranchInput) {
      const matchedBranchId = await resolveBranchIdFromInput(preferredBranchInput);
      if (!matchedBranchId) {
        res.status(400).json({ error: 'Preferred branch not found' });
        return;
      }

      resolvedBranchId = matchedBranchId;
    }

    if (branchIdInput && !resolvedBranchId) {
      res.status(400).json({ error: 'Branch not found' });
      return;
    }

    const application = await prisma.membershipApplication.create({
      data: {
        referenceNo,
        applicantId: applicant.id,
        applicantType: applicantType || 'INDIVIDUAL',
        status: termsAccepted ? 'SUBMITTED' : 'DRAFT',
        occupation, employer, incomeRange,
        membershipPaymentAmount,
        savingType,
        savingPaymentAmount,
        savingTransactionRef,
        branchId: resolvedBranchId,
        membershipProduct,
        emergencyContactName, emergencyContactPhone,
        termsAccepted: termsAccepted || false,
        privacyAccepted: privacyAccepted || false,
        signature,
        submittedAt: termsAccepted ? new Date() : undefined,
      },
      include: { applicant: true, branch: true },
    });

    if (application.status === 'SUBMITTED' && application.applicant.email) {
      const submittedMessage = buildMembershipSubmittedTemplate(
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
    console.error('Create membership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/membership - List all membership applications (admin)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      branchId,
      branchName,
      applicantType,
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
    if (branchId) where.branchId = branchId;
    if (branchName) where.branch = { name: String(branchName) };
    if (applicantType) where.applicantType = applicantType;
    if (assignedToId) where.assignedToId = assignedToId;
    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { referenceNo: { contains: normalizedSearch } },
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

    const allowedSortFields = ['createdAt', 'updatedAt', 'submittedAt', 'status', 'referenceNo'] as const;
    const orderField = allowedSortFields.includes(String(sortBy) as (typeof allowedSortFields)[number])
      ? (String(sortBy) as (typeof allowedSortFields)[number])
      : 'createdAt';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [applications, total] = await Promise.all([
      prisma.membershipApplication.findMany({
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
      prisma.membershipApplication.count({ where }),
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
    console.error('List membership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/membership/:id - Get single application
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);

    const application = await prisma.membershipApplication.findUnique({
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
    console.error('Get membership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/membership/:id/status - Update application status (admin)
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'MEMBERSHIP_OFFICER', 'BRANCH_MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);
    const { note } = req.body;
    const statusValue = typeof req.body.status === 'string' ? req.body.status : null;

    if (!statusValue || !isValidStatus(statusValue)) {
      res.status(400).json({ error: 'Valid status is required' });
      return;
    }

    const status: ApplicationStatus = statusValue;

    const application = await prisma.membershipApplication.findUnique({ where: { id }, include: { applicant: true } });

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

    const updated = await prisma.membershipApplication.update({
      where: { id },
      data: {
        status,
        reviewedAt: ['APPROVED', 'REJECTED'].includes(status) ? new Date() : undefined,
      },
    });

    // Record workflow history
    await prisma.workflowHistory.create({
      data: {
        fromStatus: application.status,
        toStatus: status,
        note,
        changedById: req.user!.id,
        membershipApplicationId: application.id,
      },
    });

    if (status === 'APPROVED' && application.applicant.email) {
      const approvedMessage = buildMembershipApprovedTemplate(
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
    console.error('Update membership status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/membership/:id/assign - Assign officer (admin)
router.patch('/:id/assign', authenticate, authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);
    const { assignedToId } = req.body;
    const updated = await prisma.membershipApplication.update({
      where: { id },
      data: { assignedToId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    res.json({ application: updated });
  } catch (error) {
    console.error('Assign membership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/membership/:id - Update membership profile details (admin)
router.patch('/:id', authenticate, authorize('SUPER_ADMIN', 'MEMBERSHIP_OFFICER', 'BRANCH_MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);
    const {
      phone,
      email,
      dob,
      gender,
      nationality,
      region,
      city,
      subCity,
      woreda,
      address,
      idType,
      idNumber,
      applicantType,
      occupation,
      employer,
      incomeRange,
      membershipProduct,
      membershipPaymentAmount,
      savingType,
      savingPaymentAmount,
      savingTransactionRef,
      emergencyContactName,
      emergencyContactPhone,
      termsAccepted,
      privacyAccepted,
      signature,
      preferredBranch,
      status,
      note,
    } = req.body;

    const { firstName, middleName, lastName } = resolveMembershipNameParts(req.body);

    if (!firstName || !lastName || !phone) {
      res.status(400).json({ error: 'First name, last name, and phone are required' });
      return;
    }

    const existing = await prisma.membershipApplication.findUnique({
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
        dob: dob ? new Date(dob) : null,
        gender: gender || null,
        nationality,
        region,
        city,
        subCity,
        woreda,
        address,
        idType,
        idNumber,
      },
    });

    const updated = await prisma.membershipApplication.update({
      where: { id },
      data: {
        applicantType: applicantType || existing.applicantType,
        occupation,
        employer,
        incomeRange,
        membershipPaymentAmount,
        savingType,
        savingPaymentAmount,
        savingTransactionRef,
        membershipProduct,
        emergencyContactName,
        emergencyContactPhone,
        termsAccepted: typeof termsAccepted === 'boolean' ? termsAccepted : existing.termsAccepted,
        privacyAccepted: typeof privacyAccepted === 'boolean' ? privacyAccepted : existing.privacyAccepted,
        signature,
        branchId: resolvedBranchId,
        status: nextStatus,
        reviewedAt: nextStatus && ['APPROVED', 'REJECTED'].includes(nextStatus) ? new Date() : undefined,
      },
      include: { applicant: true, branch: true, assignedTo: { select: { id: true, name: true } } },
    });

    if (nextStatus) {
      await prisma.workflowHistory.create({
        data: {
          fromStatus: existing.status,
          toStatus: nextStatus,
          note,
          changedById: req.user!.id,
          membershipApplicationId: existing.id,
        },
      });
    }

    res.json({ application: updated });
  } catch (error) {
    console.error('Update membership profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
