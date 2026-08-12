import { AdminUser, Branch } from '@prisma/client';
import { IUserResponse } from '../interfaces/users.interface';

type UserWithBranch = AdminUser & {
  branch?: Branch | null;
};

export class UsersMapper {
  static toResponse(user: UserWithBranch): IUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      branch: user.branch
        ? {
            id: user.branch.id,
            name: user.branch.name,
          }
        : null,
    };
  }

  static toResponseList(users: UserWithBranch[]): IUserResponse[] {
    return users.map(user => this.toResponse(user));
  }
}
