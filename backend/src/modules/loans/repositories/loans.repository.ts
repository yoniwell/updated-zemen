import { prisma } from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class LoansRepository {
  async create(applicantData: Prisma.ApplicantCreateInput, loanData: Omit<Prisma.LoanApplicationCreateInput, 'applicant'>) {
    return prisma.$transaction(async (tx) => {
      let applicant = undefined;
      
      if (applicantData.phone) {
        applicant = await tx.applicant.findUnique({ where: { phone: applicantData.phone } });
      }

      if (!applicant) {
        applicant = await tx.applicant.create({
          data: applicantData
        });
      } else {
        applicant = await tx.applicant.update({
          where: { id: applicant.id },
          data: {
            firstName: applicantData.firstName,
            fathersName: applicantData.fathersName,
            grandfathersName: applicantData.grandfathersName,
            email: applicantData.email,
          }
        });
      }

      const loan = await tx.loanApplication.create({
        data: {
          ...loanData,
          applicant: { connect: { id: applicant.id } }
        },
        include: { applicant: true, branch: true }
      });

      return loan;
    });
  }

  async findById(id: string) {
    return prisma.loanApplication.findUnique({
      where: { id },
      include: { applicant: true, branch: true, documents: true, notes: { include: { author: true } }, workflow: { include: { changedBy: true } } }
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.LoanApplicationWhereInput;
    orderBy?: Prisma.LoanApplicationOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return prisma.loanApplication.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      include: { applicant: true, branch: true, documents: true }
    });
  }

  async count(where?: Prisma.LoanApplicationWhereInput) {
    return prisma.loanApplication.count({ where });
  }

  async update(id: string, data: Prisma.LoanApplicationUpdateInput) {
    return prisma.loanApplication.update({
      where: { id },
      data,
      include: { applicant: true, branch: true }
    });
  }

  async updateApplicant(id: string, data: Prisma.ApplicantUpdateInput) {
    return prisma.applicant.update({
      where: { id },
      data
    });
  }

  async createAuditLog(data: Omit<Prisma.AuditLogCreateInput, 'user'> & { userId?: string }) {
    const { userId, ...rest } = data;
    if (!userId || userId === 'SYSTEM') return null;
    
    return prisma.auditLog.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
      }
    });
  }

  async addNote(loanApplicationId: string, authorId: string, content: string, isInternal: boolean) {
    return prisma.applicationNote.create({
      data: {
        loanApplicationId,
        authorId,
        content,
        isInternal,
      },
      include: {
        author: true
      }
    });
  }

  async createDocument(data: Prisma.DocumentCreateInput) {
    return prisma.document.create({ data });
  }

  async findDocumentById(id: string) {
    return prisma.document.findUnique({ where: { id } });
  }

  async findDocumentsByLoanId(loanApplicationId: string) {
    return prisma.document.findMany({ where: { loanApplicationId } });
  }

  async updateDocument(id: string, data: Prisma.DocumentUpdateInput) {
    return prisma.document.update({ where: { id }, data });
  }
}
