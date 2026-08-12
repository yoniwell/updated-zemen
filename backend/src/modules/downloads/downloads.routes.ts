import { Router } from 'express';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadUnrestricted } from '../../middleware/upload';
import { AppError } from '../../common/errors/AppError';

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

const downloadsService = new DownloadsService();
const downloadsController = new DownloadsController(downloadsService);

export const downloadsRoutes = Router();

// Public
downloadsRoutes.get('/', downloadsController.getPublished);

// Admin routes
downloadsRoutes.use(authenticate);
downloadsRoutes.use(authorize('SUPER_ADMIN', 'CONTENT_MANAGER'));

downloadsRoutes.get('/categories', downloadsController.getAllCategories);
downloadsRoutes.post('/categories', downloadsController.createCategory);
downloadsRoutes.patch('/categories/:id', downloadsController.updateCategory);
downloadsRoutes.delete('/categories/:id', downloadsController.deleteCategory);

downloadsRoutes.post('/files', uploadUnrestricted.single('file'), downloadsController.uploadFile);
downloadsRoutes.patch('/files/:id', downloadsController.updateFile);
downloadsRoutes.delete('/files/:id', downloadsController.deleteFile);
