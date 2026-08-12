import { Request, Response, NextFunction } from 'express';
import { NewsService } from './news.service';
import { sendResponse } from '../../common/responses/response.helper';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../common/errors/AppError';

export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.newsService.getAll();
      sendResponse(res, 200, items);
    } catch (error) { next(error); }
  };

  getPublished = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.newsService.getPublished();
      sendResponse(res, 200, items);
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.newsService.getById(req.params.id as string);
      sendResponse(res, 200, item);
    } catch (error) { next(error); }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, excerpt, content, imageUrl, category, status } = req.body;
      if (!title || !excerpt) throw new AppError('Title and excerpt are required', 400);
      const item = await this.newsService.create({ title, excerpt, content, imageUrl, category, status });
      sendResponse(res, 201, { data: item });
    } catch (error) { next(error); }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.newsService.update(req.params.id as string, req.body);
      sendResponse(res, 200, { data: item });
    } catch (error) { next(error); }
  };

  uploadImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) throw new AppError('No image file uploaded', 400);
      const imageUrl = `/uploads/${req.file.filename}`;
      const item = await this.newsService.updateImage(req.params.id as string, imageUrl);
      sendResponse(res, 200, { data: item, url: imageUrl });
    } catch (error) { next(error); }
  };

  remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.newsService.remove(req.params.id as string);
      sendResponse(res, 200, { success: true });
    } catch (error) { next(error); }
  };
}
