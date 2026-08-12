import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { sendResponse } from '../../../common/responses/response.helper';
import { AuthRequest } from '../../../middleware/auth.middleware';
import { AdminRole } from '@prisma/client';

export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  getSystemSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.settingsService.getSystemSettings();
      sendResponse(res, 200, { settings: result });
    } catch (error) {
      next(error);
    }
  };

  updateSystemSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id;
      const result = await this.settingsService.updateSystemSettings(req.body, executorId);
      sendResponse(res, 200, { settings: result });
    } catch (error) {
      next(error);
    }
  };

  getFeatureFlags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.settingsService.getFeatureFlags();
      sendResponse(res, 200, { flags: result });
    } catch (error) {
      next(error);
    }
  };

  updateFeatureFlags = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id;
      const result = await this.settingsService.updateFeatureFlags(req.body, executorId);
      sendResponse(res, 200, { flags: result });
    } catch (error) {
      next(error);
    }
  };


}
