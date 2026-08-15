import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { createUserSchema, updateUserSchema, usersQuerySchema } from '../validation/users.schema';
import { AppError } from '../../../common/errors/AppError';

import { requirePermission } from '../../../middleware/auth';

export const createUsersRoutes = (usersController: UsersController): Router => {
  const router = Router();
  
  router.use(authenticate);

  router.get('/', requirePermission('users:read'), validate({ query: usersQuerySchema }), usersController.getUsers);
  router.post('/', requirePermission('users:write'), validate({ body: createUserSchema }), usersController.createUser);
  
  router.patch('/bulk', requirePermission('users:write'), usersController.bulkAction);
  router.post('/:id/role-impact-preview', requirePermission('users:write'), usersController.getRoleImpactPreview);
  
  router.get('/:id', requirePermission('users:read'), usersController.getUserById);
  router.patch('/:id', requirePermission('users:write'), validate({ body: updateUserSchema }), usersController.updateUser);
  router.delete('/:id', requirePermission('users:write'), usersController.deleteUser);
  router.patch('/:id/password', requirePermission('users:write'), usersController.resetPassword);
  router.post('/:id/invite', requirePermission('users:write'), usersController.inviteUser);
  router.post('/:id/send-reset-link', requirePermission('users:write'), usersController.sendResetLink);

  return router;
};
