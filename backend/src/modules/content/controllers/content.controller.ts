import { Request, Response, NextFunction } from 'express';
import { ContentService } from '../services/content.service';
import { sendResponse } from '../../../common/responses/response.helper';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  private getModelName(req: Request): string {
    return req.params.modelName as string;
  }

  getItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modelName = this.getModelName(req);
      const items = await this.contentService.getItems(modelName, req.query as any);

      const keyMap: Record<string, string> = {
        services: 'services', service: 'services',
        savings: 'savings', saving: 'savings',
        'loan-products': 'loanProducts', 'loan-product': 'loanProducts',
        branches: 'branches', branch: 'branches',
        faqs: 'faqs', faq: 'faqs',
        announcements: 'announcements', announcement: 'announcements',
      };
      const collectionKey = keyMap[modelName] || 'items';
      sendResponse(res, 200, { data: items, [collectionKey]: items });
    } catch (error) { next(error); }
  };

  getItemById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modelName = this.getModelName(req);
      const item = await this.contentService.getItemById(modelName, req.params.id as string);
      sendResponse(res, 200, { data: item });
    } catch (error) { next(error); }
  };

  createItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modelName = this.getModelName(req);
      const executorId = req.user!.id;
      const item = await this.contentService.createItem(modelName, req.body, executorId as string);
      sendResponse(res, 201, { data: item });
    } catch (error) { next(error); }
  };

  updateItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modelName = this.getModelName(req);
      const executorId = req.user!.id as string;
      const item = await this.contentService.updateItem(modelName, req.params.id as string, req.body, executorId as string);
      sendResponse(res, 200, { data: item });
    } catch (error) { next(error); }
  };

  deleteItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modelName = this.getModelName(req);
      const executorId = req.user!.id as string;
      await this.contentService.deleteItem(modelName, req.params.id as string, executorId as string);
      sendResponse(res, 200, { success: true });
    } catch (error) { next(error); }
  };
}
