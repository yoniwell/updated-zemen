import { Router } from 'express';
import { MembershipController } from '../controllers/membership.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { applyMembershipSchema, updateMembershipStatusSchema, assignMembershipSchema, updateMembershipSchema } from '../validation/membership.schema';
import { AppError } from '../../../common/errors/AppError';
import { upload } from '../../../middleware/upload';

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

export const createMembershipRoutes = (membershipController: MembershipController): Router => {
  const router = Router();
  
  // Public application route
  router.post('/', validate({ body: applyMembershipSchema }), membershipController.applyForMembership);
  router.post('/:id/documents', upload.single('file'), membershipController.uploadDocument);

  // Admin routes
  router.use(authenticate);

  router.get('/', membershipController.getMemberships);
  router.get('/:id', membershipController.getMembershipById);
  
  router.patch('/:id/status', authorize('SUPER_ADMIN', 'MEMBERSHIP_OFFICER', 'OFFICER', 'BRANCH_MANAGER'), validate({ body: updateMembershipStatusSchema }), membershipController.updateStatus);
  router.patch('/:id/assign', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), validate({ body: assignMembershipSchema }), membershipController.assignApplication);
  router.patch('/:id', authorize('SUPER_ADMIN', 'MEMBERSHIP_OFFICER', 'OFFICER', 'BRANCH_MANAGER'), validate({ body: updateMembershipSchema }), membershipController.updateApplication);

  // Document routes
  router.get('/:id/documents', membershipController.getDocuments);
  router.patch('/:id/documents/:documentId/verify', authorize('SUPER_ADMIN', 'MEMBERSHIP_OFFICER', 'OFFICER', 'BRANCH_MANAGER', 'KYC_OFFICER'), membershipController.verifyDocument);
  
  router.post('/:id/notes', authorize('SUPER_ADMIN', 'MEMBERSHIP_OFFICER', 'OFFICER', 'BRANCH_MANAGER', 'KYC_OFFICER'), membershipController.addNote);

  return router;
};
