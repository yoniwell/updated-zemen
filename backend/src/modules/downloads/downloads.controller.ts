import { Request, Response, NextFunction } from 'express';
import { DownloadsService } from './downloads.service';
import { sendResponse } from '../../common/responses/response.helper';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../common/errors/AppError';
import path from 'path';

export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  getPublished = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.downloadsService.getPublishedCategories();
      sendResponse(res, 200, categories);
    } catch (error) { next(error); }
  };

  getAllCategories = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.downloadsService.getAllCategories();
      sendResponse(res, 200, categories);
    } catch (error) { next(error); }
  };

  createCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, sortOrder, published } = req.body;
      if (!name) throw new AppError('Category name is required', 400);
      const item = await this.downloadsService.createCategory({
        name,
        sortOrder: Number(sortOrder || 0),
        published: published !== false && published !== 'false',
      });
      sendResponse(res, 201, { data: item });
    } catch (error) { next(error); }
  };

  updateCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = { ...req.body };
      if (data.published !== undefined) data.published = data.published === true || data.published === 'true';
      const item = await this.downloadsService.updateCategory(req.params.id as string, data);
      sendResponse(res, 200, { data: item });
    } catch (error) { next(error); }
  };

  deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.downloadsService.deleteCategory(req.params.id as string);
      sendResponse(res, 200, { success: true });
    } catch (error) { next(error); }
  };

  uploadFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const { categoryId, name, sortOrder, published } = req.body;
      if (!categoryId) throw new AppError('categoryId is required', 400);

      const fileUrl = `/uploads/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase() || 'FILE';
      const bytes = req.file.size;
      const fileSize =
        bytes >= 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(bytes / 1024))} KB`;

      const item = await this.downloadsService.createFile({
        categoryId,
        name: name?.trim() || req.file.originalname,
        fileSize,
        fileType: ext,
        fileUrl,
        sortOrder: Number(sortOrder || 0),
        published: published !== 'false',
      });
      sendResponse(res, 201, { data: item });
    } catch (error) { next(error); }
  };

  updateFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = { ...req.body };
      if (data.published !== undefined) data.published = data.published === true || data.published === 'true';
      const item = await this.downloadsService.updateFile(req.params.id as string, data);
      sendResponse(res, 200, { data: item });
    } catch (error) { next(error); }
  };

  deleteFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.downloadsService.deleteFile(req.params.id as string);
      sendResponse(res, 200, { success: true });
    } catch (error) { next(error); }
  };
}
