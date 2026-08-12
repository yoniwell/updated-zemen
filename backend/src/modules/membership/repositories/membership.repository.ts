import { prisma } from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class MembershipRepository {
  async create(applicantData: Prisma.ApplicantCreateInput, membershipData: Omit<Prisma.MembershipApplicationCreateInput, 'applicant'>) {
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
        // Update with latest info
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

      const membership = await tx.membershipApplication.create({
        data: {
          ...membershipData,
          applicant: { connect: { id: applicant.id } }
        },
        include: { applicant: true, branch: true }
      });

      return membership;
    });
  }

  async findById(id: string) {
    return prisma.membershipApplication.findUnique({
      where: { id },
      include: { applicant: true, branch: true, documents: true, notes: { include: { author: true } }, workflow: { include: { changedBy: true } } }
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.MembershipApplicationWhereInput;
    orderBy?: Prisma.MembershipApplicationOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return prisma.membershipApplication.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      include: { applicant: true, branch: true, documents: true }
    });
  }

  async count(where?: Prisma.MembershipApplicationWhereInput) {
    return prisma.membershipApplication.count({ where });
  }

  async update(id: string, data: Prisma.MembershipApplicationUpdateInput) {
    return prisma.membershipApplication.update({
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

  async addNote(membershipApplicationId: string, authorId: string, content: string, isInternal: boolean) {
    return prisma.applicationNote.create({
      data: {
        membershipApplicationId,
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

  async findDocumentsByMembershipId(membershipApplicationId: string) {
    return prisma.document.findMany({ where: { membershipApplicationId } });
  }

  async updateDocument(id: string, data: Prisma.DocumentUpdateInput) {
    return prisma.document.update({ where: { id }, data });
  }
}
