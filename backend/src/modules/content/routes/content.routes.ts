import { Router } from 'express';
import { ContentController } from '../controllers/content.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { AppError } from '../../../common/errors/AppError';
import { validate } from '../../../middleware/validate.middleware';
import {
  createFaqSchema, updateFaqSchema,
  createServiceSchema, updateServiceSchema,
  createAnnouncementSchema, updateAnnouncementSchema,
  createSavingSchema, updateSavingSchema,
  createLoanProductSchema, updateLoanProductSchema
} from '../validation/content.schema';

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

const mapModelToSchema = (req: any, res: any, next: any) => {
  const map: Record<string, any> = {
    faqs: { POST: createFaqSchema, PATCH: updateFaqSchema },
    services: { POST: createServiceSchema, PATCH: updateServiceSchema },
    savings: { POST: createSavingSchema, PATCH: updateSavingSchema },
    'loan-products': { POST: createLoanProductSchema, PATCH: updateLoanProductSchema },
    announcements: { POST: createAnnouncementSchema, PATCH: updateAnnouncementSchema },
  };

  const modelName = req.params.modelName;
  const method = req.method;

  if (map[modelName] && map[modelName][method]) {
    return validate({ body: map[modelName][method] })(req, res, next);
  }
  next();
};

export const createContentRoutes = (contentController: ContentController): Router => {
  const router = Router();

  // Public read access for content
  router.get('/:modelName', contentController.getItems);
  router.get('/:modelName/:id', contentController.getItemById);

  router.use(authenticate);
  router.use(authorize('SUPER_ADMIN', 'CONTENT_MANAGER'));

  router.post('/:modelName', mapModelToSchema, contentController.createItem);
  router.patch('/:modelName/:id', mapModelToSchema, contentController.updateItem);
  router.delete('/:modelName/:id', contentController.deleteItem);

  return router;
};
