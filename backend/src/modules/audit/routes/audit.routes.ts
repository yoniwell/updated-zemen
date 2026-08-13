import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { auditQuerySchema } from '../validation/audit.schema';
import { AppError } from '../../../common/errors/AppError';

import { requirePermission } from '../../../middleware/auth';

export const createAuditRoutes = (auditController: AuditController): Router => {
  const router = Router();
  
  router.use(authenticate);
  router.use(requirePermission('audit:read'));

  router.get('/', validate({ query: auditQuerySchema }), auditController.getLogs);
  router.get('/dashboard', auditController.getDashboardStats);

  return router;
};
