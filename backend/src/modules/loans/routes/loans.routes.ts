import { Router } from 'express';
import { LoansController } from '../controllers/loans.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { applyLoanSchema, updateLoanStatusSchema, assignLoanSchema, updateLoanSchema } from '../validation/loans.schema';
import { AppError } from '../../../common/errors/AppError';
import { upload } from '../../../middleware/upload';

import { requirePermission } from '../../../middleware/auth';

export const createLoansRoutes = (loansController: LoansController): Router => {
  const router = Router();
  
  // Public application route
  router.post('/', validate({ body: applyLoanSchema }), loansController.applyForLoan);
  router.post('/:id/documents', upload.single('file'), loansController.uploadDocument);

  // Admin routes
  router.use(authenticate);

  router.get('/', requirePermission('loans:read'), loansController.getLoans);
  router.get('/:id', requirePermission('loans:read'), loansController.getLoanById);
  
  router.patch('/:id/status', requirePermission('loans:approve'), validate({ body: updateLoanStatusSchema }), loansController.updateStatus);
  router.patch('/:id/assign', requirePermission('loans:write'), validate({ body: assignLoanSchema }), loansController.assignApplication);
  router.patch('/:id', requirePermission('loans:write'), validate({ body: updateLoanSchema }), loansController.updateApplication);

  // Document routes
  router.get('/:id/documents', requirePermission('loans:read'), loansController.getDocuments);
  router.patch('/:id/documents/:documentId/verify', requirePermission('documents:verify'), loansController.verifyDocument);
  
  router.post('/:id/notes', requirePermission('loans:write'), loansController.addNote);

  return router;
};
