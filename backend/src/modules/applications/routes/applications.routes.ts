import { Router } from 'express';
import { ApplicationsController } from '../controllers/applications.controller';
import { authenticate } from '../../../middleware/auth.middleware';

export const applicationsRoutes = Router();
const controller = new ApplicationsController();

applicationsRoutes.post('/otp/send', controller.sendOtp);
applicationsRoutes.post('/otp/verify', controller.verifyOtp);

applicationsRoutes.get('/documents/review', authenticate, controller.getReviewDocuments);
applicationsRoutes.patch('/documents/bulk-status', authenticate, controller.bulkUpdateDocumentStatus);
