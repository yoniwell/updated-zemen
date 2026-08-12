import { Request, Response, NextFunction } from 'express';
import { MembershipService } from '../services/membership.service';
import { sendResponse } from '../../../common/responses/response.helper';
import { AuthRequest } from '../../../middleware/auth.middleware';
import { sendNotification } from '../../notifications/services/notification.service';
import { logger } from '../../../common/utils/logger';

export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  applyForMembership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const application = await this.membershipService.applyForMembership(req.body);
      
      // Send success email asynchronously
      if (req.body.email) {
        setImmediate(() => {
          sendNotification({
            to: req.body.email,
            subject: 'Membership Application Received',
            message: `Dear ${req.body.firstName},\n\nWe have successfully received your membership application. Your reference number is ${application.referenceNo || application.id}. We will review your application and get back to you soon.\n\nThank you,\nZemen Sacco`,
            channel: 'EMAIL'
          }).catch(err => logger.error({ err }, 'Failed to send membership success email'));
        });
      }

      sendResponse(res, 201, { application });
    } catch (error) {
      next(error);
    }
  };

  getMemberships = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role === 'BRANCH_MANAGER' || req.user?.role === 'OFFICER') {
        if (req.user.branchId) req.query.branchId = req.user.branchId;
      }
      const result = await this.membershipService.getMemberships(req.query);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };

  getMembershipById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const application = await this.membershipService.getMembershipById(req.params.id as string);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const application = await this.membershipService.updateStatus(req.params.id as string, req.body, executorId);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  assignApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const application = await this.membershipService.assignApplication(req.params.id as string, req.body, executorId);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  updateApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const application = await this.membershipService.updateApplication(req.params.id as string, req.body, executorId);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  getDocuments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const documents = await this.membershipService.getDocuments(req.params.id as string);
      sendResponse(res, 200, { documents });
    } catch (error) {
      next(error);
    }
  };

  uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const dto: import('../dto/membership.dto').UploadDocumentDto = {
        membershipId: req.params.id as string,
        category: req.body.category,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      const executorId = req.user?.id || 'SYSTEM';

      const document = await this.membershipService.uploadDocument(dto, executorId);
      sendResponse(res, 201, { document });
    } catch (error) {
      next(error);
    }
  };

  verifyDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const document = await this.membershipService.verifyDocument(req.params.id as string, req.params.documentId as string, req.body, executorId);
      sendResponse(res, 200, { document });
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const note = await this.membershipService.addNote(req.params.id as string, req.body, executorId);
      sendResponse(res, 201, { note });
    } catch (error) {
      next(error);
    }
  };
}
