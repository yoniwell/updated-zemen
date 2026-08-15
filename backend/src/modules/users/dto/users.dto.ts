import { AdminRole } from '@prisma/client';

export interface CreateUserDto {
  name: string;
  email: string;
  password?: string;
  role: AdminRole;
  branchId?: string;
  isActive?: boolean;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: AdminRole;
  branchId?: string | null;
  isActive?: boolean;
}

export interface UpdateUserPasswordDto {
  passwordHash: string;
}

export interface UsersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminRole;
  branchId?: string;
  isActive?: string;
}

export interface BulkCreateUserDto {
  users: CreateUserDto[];
}
