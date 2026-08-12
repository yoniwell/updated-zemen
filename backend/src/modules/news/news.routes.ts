import { Router } from 'express';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadAnyImage } from '../../middleware/upload';
import { AppError } from '../../common/errors/AppError';

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

const newsService = new NewsService();
const newsController = new NewsController(newsService);

export const newsRoutes = Router();

const adminAuth = [authenticate, authorize('SUPER_ADMIN', 'CONTENT_MANAGER')];

// Admin routes (must come before /:id)
newsRoutes.get('/admin/all', adminAuth, newsController.getAll);
newsRoutes.post('/', adminAuth, newsController.create);
newsRoutes.patch('/:id', adminAuth, newsController.update);
newsRoutes.post('/:id/image', adminAuth, uploadAnyImage.single('file'), newsController.uploadImage);
newsRoutes.delete('/:id', adminAuth, newsController.remove);

// Public routes
newsRoutes.get('/', newsController.getPublished);
newsRoutes.get('/:id', newsController.getById);
