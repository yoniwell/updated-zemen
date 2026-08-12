import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { auditQuerySchema } from '../validation/audit.schema';
import { AppError } from '../../../common/errors/AppError';

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

export const createAuditRoutes = (auditController: AuditController): Router => {
  const router = Router();
  
  router.use(authenticate);
  router.use(authorize('SUPER_ADMIN', 'BRANCH_MANAGER')); // Depending on your auth scheme

  router.get('/', validate({ query: auditQuerySchema }), auditController.getLogs);
  router.get('/dashboard', auditController.getDashboardStats);

  return router;
};
