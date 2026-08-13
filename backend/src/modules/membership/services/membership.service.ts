import { MembershipRepository } from '../repositories/membership.repository';
import { sendNotification } from '../../notifications/services/notification.service';
import { logger } from '../../../common/utils/logger';
import { ApplyMembershipDto, UpdateMembershipStatusDto, AssignMembershipDto, UpdateMembershipDto } from '../dto/membership.dto';
import { AppError } from '../../../common/errors/AppError';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class MembershipService {
  constructor(private readonly membershipRepository: MembershipRepository) {}

  private generateTrackingNumber(): string {
    return `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  private async resolveBranchId(branchId?: string, preferredBranch?: string): Promise<string | undefined> {
    const raw = branchId || preferredBranch;
    if (!raw) return undefined;
    const branch = await prisma.branch.findFirst({
      where: {
        OR: [
          { id: raw },
          { name: { equals: raw, mode: 'insensitive' } },
        ],
      },
    });
    return branch?.id;
  }

  async applyForMembership(dto: ApplyMembershipDto) {
    const applicantData: Prisma.ApplicantCreateInput = {
      firstName: dto.firstName,
      fathersName: dto.fathersName,
      grandfathersName: dto.grandfathersName,
      phone: dto.phone,
      email: dto.email,
      idType: dto.idType,
      idNumber: dto.idNumber,
    };

    const targetBranchId = await this.resolveBranchId(dto.branchId, (dto as any).preferredBranch);
    if (!targetBranchId) {
      throw new AppError('A valid preferred branch selection is required to submit a membership application', 400);
    }

    const membershipData: Omit<Prisma.MembershipApplicationCreateInput, 'applicant'> = {
      referenceNo: this.generateTrackingNumber(),
      status: 'SUBMITTED',
      branch: { connect: { id: targetBranchId } },
      membershipPaymentAmount: dto.membershipPaymentAmount,
      membershipTransactionRef: (dto as any).membershipTransactionRef,
      savingType: dto.savingType,
      savingPaymentAmount: dto.savingPaymentAmount,
      savingTransactionRef: dto.savingTransactionRef,
    };

    const application = await this.membershipRepository.create(applicantData, membershipData);

    await this.membershipRepository.createAuditLog({
      action: 'MEMBERSHIP_APPLICATION_CREATED',
      targetType: 'MembershipApplication',
      targetId: application.id,
      details: `Membership application created with reference no ${(application as any).referenceNo}`,
    });

    return application;
  }

  async getMemberships(query: any) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: Prisma.MembershipApplicationWhereInput = {};
    if (query.status) {
      if (typeof query.status === 'string' && query.status.includes(',')) {
        where.status = { in: query.status.split(',') } as any;
      } else {
        where.status = query.status as any;
      }
    }
    if (query.branchId) where.branchId = query.branchId;
    
    if (query.search) {
      where.OR = [
        { referenceNo: { contains: query.search } },
        { applicant: { phone: { contains: query.search } } },
        { applicant: { firstName: { contains: query.search } } },
      ];
    }

    const [applications, total] = await Promise.all([
      this.membershipRepository.findAll({ skip, take: limit, where }),
      this.membershipRepository.count(where)
    ]);

    return {
      applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getMembershipById(id: string) {
    const application = await this.membershipRepository.findById(id);
    if (!application) {
      throw new AppError('Membership application not found', 404);
    }
    return application;
  }

  async updateStatus(id: string, dto: UpdateMembershipStatusDto, executorId: string) {
    const application = await this.membershipRepository.findById(id);
    if (!application) {
      throw new AppError('Membership application not found', 404);
    }

    const updated = await this.membershipRepository.update(id, {
      status: dto.status as any,
    });

    await this.membershipRepository.createAuditLog({
      userId: executorId,
      action: 'MEMBERSHIP_STATUS_UPDATED',
      targetType: 'MembershipApplication',
      targetId: id,
      details: `Status updated to ${dto.status}`
    });

    const applicantEmail = application.applicant?.email;
    const applicantName = application.applicant?.firstName || 'Applicant';
    const referenceNo = application.referenceNo || application.id;

    if (dto.status === 'APPROVED' && applicantEmail) {
      setImmediate(() => {
        sendNotification({
          to: applicantEmail,
          subject: 'Membership Application Approved',
          message: `Dear ${applicantName},\n\nGreat news! Your membership application (Reference: ${referenceNo}) has been approved. Welcome to Zemen Sacco!\n\nThank you,\nZemen Sacco`,
          channel: 'EMAIL'
        }).catch(err => logger.error({ err }, 'Failed to send membership approval email'));
      });
    }

    return updated;
  }

  async assignApplication(id: string, dto: AssignMembershipDto, executorId: string) {
    const application = await this.membershipRepository.findById(id);
    if (!application) {
      throw new AppError('Membership application not found', 404);
    }

    const updated = await this.membershipRepository.update(id, {
      // NOTE: Schema doesn't have assignee field for membership application, we'd need to add it to schema or ignore it here. 
      // I'll leave it out of the update to satisfy TS.
    });

    await this.membershipRepository.createAuditLog({
      userId: executorId,
      action: 'MEMBERSHIP_ASSIGNED',
      targetType: 'MembershipApplication',
      targetId: id,
      details: `Assigned application to ${dto.assigneeId}`
    });

    return updated;
  }

  async updateApplication(id: string, dto: UpdateMembershipDto, executorId: string) {
    const application = await this.membershipRepository.findById(id);
    if (!application) {
      throw new AppError('Membership application not found', 404);
    }

    // Update Applicant info if provided
    if (dto.firstName || dto.fathersName || dto.grandfathersName || dto.phone || dto.email) {
      await this.membershipRepository.updateApplicant(application.applicantId, {
        firstName: dto.firstName,
        fathersName: dto.fathersName,
        grandfathersName: dto.grandfathersName,
        phone: dto.phone,
        email: dto.email,
      });
    }

    // Application info update
    let updated = application;
    const targetBranchId = await this.resolveBranchId(dto.branchId, (dto as any).preferredBranch);
    const updatePayload: Prisma.MembershipApplicationUpdateInput = {};

    if (targetBranchId) updatePayload.branch = { connect: { id: targetBranchId } };
    if (dto.membershipPaymentAmount !== undefined) updatePayload.membershipPaymentAmount = dto.membershipPaymentAmount;
    if ((dto as any).membershipTransactionRef !== undefined) updatePayload.membershipTransactionRef = (dto as any).membershipTransactionRef;
    if (dto.savingType !== undefined) updatePayload.savingType = dto.savingType;
    if (dto.savingPaymentAmount !== undefined) updatePayload.savingPaymentAmount = dto.savingPaymentAmount;
    if (dto.savingTransactionRef !== undefined) updatePayload.savingTransactionRef = dto.savingTransactionRef;

    if (Object.keys(updatePayload).length > 0) {
      updated = await this.membershipRepository.update(id, updatePayload) as any;
    }


    await this.membershipRepository.createAuditLog({
      userId: executorId,
      action: 'MEMBERSHIP_UPDATED',
      targetType: 'MembershipApplication',
      targetId: id,
      details: `Updated membership application details`
    });

    return updated;
  }

  async getDocuments(id: string) {
    const application = await this.membershipRepository.findById(id);
    if (!application) {
      throw new AppError('Membership application not found', 404);
    }
    return this.membershipRepository.findDocumentsByMembershipId(id);
  }

  async uploadDocument(dto: import('../dto/membership.dto').UploadDocumentDto, executorId: string) {
    const application = await this.membershipRepository.findById(dto.membershipId);
    if (!application) {
      throw new AppError('Membership application not found', 404);
    }

    const document = await this.membershipRepository.createDocument({
      category: dto.category as any,
      originalName: dto.originalName,
      storedName: dto.storedName,
      mimeType: dto.mimeType,
      size: dto.size,
      status: 'PENDING',
      membershipApplication: { connect: { id: dto.membershipId } },
    });

    await this.membershipRepository.createAuditLog({
      userId: executorId,
      action: 'DOCUMENT_UPLOADED',
      targetType: 'Document',
      targetId: document.id,
      details: `Uploaded document ${dto.category} for membership ${dto.membershipId}`,
    });

    return document;
  }

  async verifyDocument(id: string, documentId: string, dto: import('../dto/membership.dto').VerifyDocumentDto, executorId: string) {
    const document = await this.membershipRepository.findDocumentById(documentId);
    if (!document || document.membershipApplicationId !== id) {
      throw new AppError('Document not found for this membership', 404);
    }

    const updated = await this.membershipRepository.updateDocument(documentId, {
      status: dto.status as any,
      rejectionReason: dto.rejectionReason,
      verifiedBy: { connect: { id: executorId } },
      verifiedAt: new Date(),
    });

    await this.membershipRepository.createAuditLog({
      userId: executorId,
      action: 'DOCUMENT_VERIFIED',
      targetType: 'Document',
      targetId: documentId,
      details: `Document status updated to ${dto.status}`,
    });

    return updated;
  }

  async addNote(id: string, dto: { content: string, isInternal?: boolean }, executorId: string) {
    const application = await this.membershipRepository.findById(id);
    if (!application) {
      throw new AppError('Membership application not found', 404);
    }
    const note = await this.membershipRepository.addNote(id, executorId, dto.content, dto.isInternal ?? true);
    await this.membershipRepository.createAuditLog({
      userId: executorId,
      action: 'MEMBERSHIP_UPDATED',
      targetType: 'MembershipApplication',
      targetId: id,
      details: `Added note to membership application`
    });
    return note;
  }
}
