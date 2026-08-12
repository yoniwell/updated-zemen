import { Router } from 'express';
import { LoansController } from '../controllers/loans.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { applyLoanSchema, updateLoanStatusSchema, assignLoanSchema, updateLoanSchema } from '../validation/loans.schema';
import { AppError } from '../../../common/errors/AppError';
import { upload } from '../../../middleware/upload';

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

export const createLoansRoutes = (loansController: LoansController): Router => {
  const router = Router();
  
  // Public application route
  router.post('/', validate({ body: applyLoanSchema }), loansController.applyForLoan);
  router.post('/:id/documents', upload.single('file'), loansController.uploadDocument);

  // Admin routes
  router.use(authenticate);

  router.get('/', loansController.getLoans);
  router.get('/:id', loansController.getLoanById);
  
  router.patch('/:id/status', authorize('SUPER_ADMIN', 'LOAN_OFFICER', 'OFFICER', 'BRANCH_MANAGER'), validate({ body: updateLoanStatusSchema }), loansController.updateStatus);
  router.patch('/:id/assign', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), validate({ body: assignLoanSchema }), loansController.assignApplication);
  router.patch('/:id', authorize('SUPER_ADMIN', 'LOAN_OFFICER', 'OFFICER', 'BRANCH_MANAGER'), validate({ body: updateLoanSchema }), loansController.updateApplication);

  // Document routes
  router.get('/:id/documents', loansController.getDocuments);
  router.patch('/:id/documents/:documentId/verify', authorize('SUPER_ADMIN', 'LOAN_OFFICER', 'OFFICER', 'BRANCH_MANAGER'), loansController.verifyDocument);
  
  router.post('/:id/notes', authorize('SUPER_ADMIN', 'LOAN_OFFICER', 'OFFICER', 'BRANCH_MANAGER'), loansController.addNote);

  return router;
};
