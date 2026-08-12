import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { AppError } from '../../../common/errors/AppError';
import { UsersMapper } from '../mappers/users.mapper';
import { sendResponse } from '../../../common/responses/response.helper';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user!.role === 'BRANCH_MANAGER') {
        req.query.branchId = req.user!.branchId || undefined;
      }
      const result = await this.usersService.getUsers(req.query);
      sendResponse(res, 200, {
        ...result,
        users: UsersMapper.toResponseList(result.users)
      });
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.usersService.getUserById(req.params.id as string);
      if (req.user!.role === 'BRANCH_MANAGER' && user.branchId !== req.user!.branchId) {
        throw new AppError('Forbidden', 403);
      }
      sendResponse(res, 200, { user: UsersMapper.toResponse(user) });
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user!.role === 'BRANCH_MANAGER') {
        req.body.branchId = req.user!.branchId;
      }
      const executorId = req.user!.id;
      const user = await this.usersService.createUser(req.body, executorId);
      sendResponse(res, 201, { user: UsersMapper.toResponse(user) });
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetUser = await this.usersService.getUserById(req.params.id as string);
      if (req.user!.role === 'BRANCH_MANAGER') {
        if (targetUser.branchId !== req.user!.branchId) throw new AppError('Forbidden', 403);
        req.body.branchId = req.user!.branchId;
      }
      const executorId = req.user!.id as string;
      const user = await this.usersService.updateUser(req.params.id as string, req.body, executorId);
      sendResponse(res, 200, { user: UsersMapper.toResponse(user) });
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetUser = await this.usersService.getUserById(req.params.id as string);
      if (req.user!.role === 'BRANCH_MANAGER' && targetUser.branchId !== req.user!.branchId) {
        throw new AppError('Forbidden', 403);
      }
      await this.usersService.deleteUser(req.params.id as string, req.user!.id as string, req.body?.reason);
      sendResponse(res, 200, { success: true });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
      }
      await this.usersService.resetPassword(req.params.id as string, password, req.user!.id as string);
      sendResponse(res, 200, { success: true });
    } catch (error) {
      next(error);
    }
  };

  inviteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.usersService.inviteUser(req.params.id as string, req.user!.id as string);
      sendResponse(res, 200, { success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  bulkAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const { userIds, action, role, branchId } = req.body;
      
      let affectedCount = 0;
      if (Array.isArray(userIds)) {
        for (const userId of userIds) {
          try {
            const targetUser = await this.usersService.getUserById(userId);
            if (req.user!.role === 'BRANCH_MANAGER' && targetUser.branchId !== req.user!.branchId) {
              continue; // Skip users not in their branch
            }
            if (req.user!.role === 'BRANCH_MANAGER' && action === 'assignBranch') {
              continue; // Branch managers cannot assign branches via bulk
            }
            if (action === 'assignRole' && role) {
              await this.usersService.updateUser(userId, { role }, executorId);
              affectedCount++;
            } else if (action === 'assignBranch' && branchId) {
              await this.usersService.updateUser(userId, { branchId }, executorId);
              affectedCount++;
            } else if (action === 'deactivate') {
              await this.usersService.updateUser(userId, { isActive: false }, executorId);
              affectedCount++;
            } else if (action === 'activate') {
              await this.usersService.updateUser(userId, { isActive: true }, executorId);
              affectedCount++;
            }
          } catch (e) {
            console.error(`Failed to apply bulk action to user ${userId}:`, e);
          }
        }
      }
      
      sendResponse(res, 200, { success: true, affectedCount });
    } catch (error) {
      next(error);
    }
  };

  getRoleImpactPreview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = req.body.role;
      // Mocking generic impact preview for now as real calculation is complex
      sendResponse(res, 200, {
        role,
        added: ['View Applications', 'Submit Documents'],
        removed: [],
        unchanged: ['Login', 'Update Profile'],
      });
    } catch (error) {
      next(error);
    }
  };
}
