import { Router } from 'express';
import { MembershipController } from '../controllers/membership.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { applyMembershipSchema, updateMembershipStatusSchema, assignMembershipSchema, updateMembershipSchema } from '../validation/membership.schema';
import { AppError } from '../../../common/errors/AppError';
import { upload } from '../../../middleware/upload';

import { requirePermission } from '../../../middleware/auth';

export const createMembershipRoutes = (membershipController: MembershipController): Router => {
  const router = Router();
  
  // Public application route
  router.post('/', validate({ body: applyMembershipSchema }), membershipController.applyForMembership);
  router.post('/:id/documents', upload.single('file'), membershipController.uploadDocument);

  // Admin routes
  router.use(authenticate);

  router.get('/', requirePermission('membership:read'), membershipController.getMemberships);
  router.get('/:id', requirePermission('membership:read'), membershipController.getMembershipById);
  
  router.patch('/:id/status', requirePermission('membership:approve'), validate({ body: updateMembershipStatusSchema }), membershipController.updateStatus);
  router.patch('/:id/assign', requirePermission('membership:write'), validate({ body: assignMembershipSchema }), membershipController.assignApplication);
  router.patch('/:id', requirePermission('membership:write'), validate({ body: updateMembershipSchema }), membershipController.updateApplication);

  // Document routes
  router.get('/:id/documents', requirePermission('membership:read'), membershipController.getDocuments);
  router.patch('/:id/documents/:documentId/verify', requirePermission('documents:verify'), membershipController.verifyDocument);
  
  router.post('/:id/notes', requirePermission('membership:write'), membershipController.addNote);

  return router;
};
