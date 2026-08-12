import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { createUserSchema, updateUserSchema, usersQuerySchema } from '../validation/users.schema';
import { AppError } from '../../../common/errors/AppError';

// Quick authorization middleware for roles
const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

export const createUsersRoutes = (usersController: UsersController): Router => {
  const router = Router();
  
  // All user management requires SUPER_ADMIN (or specific roles)
  router.use(authenticate);
  router.use(authorize('SUPER_ADMIN'));

  router.get('/', validate({ query: usersQuerySchema }), usersController.getUsers);
  router.post('/', validate({ body: createUserSchema }), usersController.createUser);
  
  router.patch('/bulk', usersController.bulkAction);
  router.post('/:id/role-impact-preview', usersController.getRoleImpactPreview);
  
  router.get('/:id', usersController.getUserById);
  router.patch('/:id', validate({ body: updateUserSchema }), usersController.updateUser);
  router.delete('/:id', usersController.deleteUser);
  router.patch('/:id/password', usersController.resetPassword);
  router.post('/:id/invite', usersController.inviteUser);

  return router;
};
