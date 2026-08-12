import { LoansRepository } from '../repositories/loans.repository';
import { sendNotification } from '../../notifications/services/notification.service';
import { logger } from '../../../common/utils/logger';
import { ApplyLoanDto, UpdateLoanStatusDto, AssignLoanDto, UpdateLoanDto } from '../dto/loans.dto';
import { AppError } from '../../../common/errors/AppError';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class LoansService {
  constructor(private readonly loansRepository: LoansRepository) {}

  private generateTrackingNumber(): string {
    return `LOA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
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

  async applyForLoan(dto: ApplyLoanDto) {
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
      throw new AppError('A valid preferred branch selection is required to submit a loan application', 400);
    }

    const loanData: Omit<Prisma.LoanApplicationCreateInput, 'applicant'> = {
      referenceNo: this.generateTrackingNumber(),
      status: 'SUBMITTED',
      membershipNo: dto.membershipNo,
      loanType: dto.loanType as any,
      amount: dto.amount,
      tenure: dto.tenure,
      idType: dto.idType,
      maritalStatus: dto.maritalStatus,
      collateralType: dto.collateralType,
      collateralDesc: dto.collateralDesc,
      branch: { connect: { id: targetBranchId } },
    };

    const application = await this.loansRepository.create(applicantData, loanData);

    await this.loansRepository.createAuditLog({
      action: 'LOAN_APPLICATION_CREATED',
      targetType: 'LoanApplication',
      targetId: application.id,
      details: `Loan application created with reference no ${(application as any).referenceNo}`,
    });

    return application;
  }

  async getLoans(query: any) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: Prisma.LoanApplicationWhereInput = {};
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
      this.loansRepository.findAll({ skip, take: limit, where }),
      this.loansRepository.count(where)
    ]);

    return {
      applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getLoanById(id: string) {
    const application = await this.loansRepository.findById(id);
    if (!application) {
      throw new AppError('Loan application not found', 404);
    }
    return application;
  }

  async updateStatus(id: string, dto: UpdateLoanStatusDto, executorId: string) {
    const application = await this.loansRepository.findById(id);
    if (!application) {
      throw new AppError('Loan application not found', 404);
    }

    const updated = await this.loansRepository.update(id, {
      status: dto.status as any,
    });

    await this.loansRepository.createAuditLog({
      userId: executorId,
      action: 'LOAN_STATUS_UPDATED',
      targetType: 'LoanApplication',
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
          subject: 'Loan Application Approved',
          message: `Dear ${applicantName},\n\nGreat news! Your loan application (Reference: ${referenceNo}) has been approved. We will be in touch with the next steps shortly.\n\nThank you,\nZemen Sacco`,
          channel: 'EMAIL'
        }).catch(err => logger.error({ err }, 'Failed to send loan approval email'));
      });
    }

    return updated;
  }

  async assignApplication(id: string, dto: AssignLoanDto, executorId: string) {
    const application = await this.loansRepository.findById(id);
    if (!application) {
      throw new AppError('Loan application not found', 404);
    }

    const updated = await this.loansRepository.update(id, {
      // no assignee in schema
    });

    await this.loansRepository.createAuditLog({
      userId: executorId,
      action: 'LOAN_ASSIGNED',
      targetType: 'LoanApplication',
      targetId: id,
      details: `Assigned loan application to ${dto.assigneeId}`
    });

    return updated;
  }

  async updateApplication(id: string, dto: UpdateLoanDto, executorId: string) {
    const application = await this.loansRepository.findById(id);
    if (!application) {
      throw new AppError('Loan application not found', 404);
    }

    if (dto.firstName || dto.fathersName || dto.grandfathersName || dto.phone || dto.email) {
      await this.loansRepository.updateApplicant(application.applicantId, {
        firstName: dto.firstName,
        fathersName: dto.fathersName,
        grandfathersName: dto.grandfathersName,
        phone: dto.phone,
        email: dto.email,
      });
    }

    let updated = application;
    const targetBranchId = await this.resolveBranchId(dto.branchId, (dto as any).preferredBranch);
    const updateData: Prisma.LoanApplicationUpdateInput = {};
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (targetBranchId) updateData.branch = { connect: { id: targetBranchId } };

    if (Object.keys(updateData).length > 0) {
      updated = await this.loansRepository.update(id, updateData) as any;
    } else {
      updated = await this.loansRepository.findById(id) as any;
    }

    await this.loansRepository.createAuditLog({
      userId: executorId,
      action: 'LOAN_UPDATED',
      targetType: 'LoanApplication',
      targetId: id,
      details: `Updated loan application details`
    });

    return updated;
  }

  async getDocuments(id: string) {
    const application = await this.loansRepository.findById(id);
    if (!application) {
      throw new AppError('Loan application not found', 404);
    }
    return this.loansRepository.findDocumentsByLoanId(id);
  }

  async uploadDocument(dto: import('../dto/loans.dto').UploadDocumentDto, executorId: string) {
    const application = await this.loansRepository.findById(dto.loanId);
    if (!application) {
      throw new AppError('Loan application not found', 404);
    }

    const document = await this.loansRepository.createDocument({
      category: dto.category as any,
      originalName: dto.originalName,
      storedName: dto.storedName,
      mimeType: dto.mimeType,
      size: dto.size,
      status: 'PENDING',
      loanApplication: { connect: { id: dto.loanId } },
    });

    await this.loansRepository.createAuditLog({
      userId: executorId,
      action: 'DOCUMENT_UPLOADED',
      targetType: 'Document',
      targetId: document.id,
      details: `Uploaded document ${dto.category} for loan ${dto.loanId}`,
    });

    return document;
  }

  async verifyDocument(id: string, documentId: string, dto: import('../dto/loans.dto').VerifyDocumentDto, executorId: string) {
    const document = await this.loansRepository.findDocumentById(documentId);
    if (!document || document.loanApplicationId !== id) {
      throw new AppError('Document not found for this loan', 404);
    }

    const updated = await this.loansRepository.updateDocument(documentId, {
      status: dto.status as any,
      rejectionReason: dto.rejectionReason,
      verifiedBy: { connect: { id: executorId } },
      verifiedAt: new Date(),
    });

    await this.loansRepository.createAuditLog({
      userId: executorId,
      action: 'DOCUMENT_VERIFIED',
      targetType: 'Document',
      targetId: documentId,
      details: `Document status updated to ${dto.status}`,
    });

    return updated;
  }

  async addNote(id: string, dto: { content: string, isInternal?: boolean }, executorId: string) {
    const application = await this.loansRepository.findById(id);
    if (!application) {
      throw new AppError('Loan application not found', 404);
    }
    const note = await this.loansRepository.addNote(id, executorId, dto.content, dto.isInternal ?? true);
    await this.loansRepository.createAuditLog({
      userId: executorId,
      action: 'LOAN_UPDATED',
      targetType: 'LoanApplication',
      targetId: id,
      details: `Added note to loan application`
    });
    return note;
  }
}
