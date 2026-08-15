import { randomBytes } from 'crypto';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto, UpdateUserDto, UsersQueryDto, BulkCreateUserDto } from '../dto/users.dto';
import { USERS_CONSTANTS } from '../constants/users.constants';
import { AppError } from '../../../common/errors/AppError';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  private generateTempPassword(): string {
    return randomBytes(12).toString('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async createUser(dto: CreateUserDto, executorId: string) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.usersRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError('Email is already registered', 400);
    }

    const passwordToHash = (dto.password && dto.password.trim()) ? dto.password.trim() : this.generateTempPassword();
    const passwordHash = await this.hashPassword(passwordToHash);

    const data: Prisma.AdminUserCreateInput = {
      name: dto.name.trim(),
      email: normalizedEmail,
      role: dto.role,
      passwordHash,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    };

    if (dto.branchId) {
      data.branch = { connect: { id: dto.branchId } };
    }

    const user = await this.usersRepository.create(data);

    await this.usersRepository.createAuditLog({
      userId: executorId,
      action: 'USER_CREATED',
      targetType: 'AdminUser',
      targetId: user.id,
      details: `Created user ${user.email} with role ${user.role}`
    });

    // In a real app, send an invite email here with tempPassword.
    return user;
  }

  async getUsers(query: UsersQueryDto & { status?: string }) {
    const page = query.page || USERS_CONSTANTS.PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(query.limit || USERS_CONSTANTS.PAGINATION.DEFAULT_LIMIT, USERS_CONSTANTS.PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where: Prisma.AdminUserWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.role) where.role = query.role;
    if (query.branchId) where.branchId = query.branchId;

    const statusVal = query.isActive ?? query.status;
    if (statusVal !== undefined && statusVal !== '') {
      const isAct = statusVal === 'true' || statusVal.toLowerCase() === 'active';
      where.isActive = isAct;
    }

    const [users, total] = await Promise.all([
      this.usersRepository.findAll({ skip, take: limit, where }),
      this.usersRepository.count(where),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getUserById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, executorId: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new AppError('Email is already registered', 400);
      }
    }

    const data: Prisma.AdminUserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    
    if (dto.branchId !== undefined) {
      if (dto.branchId === null) {
        data.branch = { disconnect: true };
      } else {
        data.branch = { connect: { id: dto.branchId } };
      }
    }

    const updated = await this.usersRepository.update(id, data);

    await this.usersRepository.createAuditLog({
      userId: executorId,
      action: 'USER_UPDATED',
      targetType: 'AdminUser',
      targetId: id,
      details: `Updated user ${updated.email}`
    });

    return updated;
  }

  async deleteUser(id: string, executorId: string, reason?: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (id === executorId) {
      throw new AppError('Cannot delete yourself', 400);
    }

    // Hard delete user record from database
    await this.usersRepository.delete(id);

    await this.usersRepository.createAuditLog({
      userId: executorId,
      action: 'USER_DELETED',
      targetType: 'AdminUser',
      targetId: id,
      details: `Deleted user ${user.email}${reason ? `: ${reason}` : ''}`
    });
  }

  async resetPassword(id: string, password: string, executorId: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const passwordHash = await this.hashPassword(password);
    await this.usersRepository.update(id, { passwordHash });

    await this.usersRepository.createAuditLog({
      userId: executorId,
      action: 'USER_UPDATED',
      targetType: 'AdminUser',
      targetId: id,
      details: `Password reset for user ${user.email}`
    });
  }

  async inviteUser(id: string, executorId: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const inviteUrl = `${frontendUrl}/admin/login?invite=${user.id}`;
    const verificationUrl = inviteUrl;

    await this.usersRepository.createAuditLog({
      userId: executorId,
      action: 'USER_UPDATED',
      targetType: 'AdminUser',
      targetId: id,
      details: `Invite sent to user ${user.email}`
    });

    return { inviteUrl, verificationUrl };
  }
}
