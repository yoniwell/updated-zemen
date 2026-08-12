import { Request, Response, NextFunction } from 'express';
import { LoansService } from '../services/loans.service';
import { sendResponse } from '../../../common/responses/response.helper';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  applyForLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const application = await this.loansService.applyForLoan(req.body);
      sendResponse(res, 201, { application });
    } catch (error) {
      next(error);
    }
  };

  getLoans = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role === 'BRANCH_MANAGER' || req.user?.role === 'OFFICER') {
        if (req.user.branchId) req.query.branchId = req.user.branchId;
      }
      const result = await this.loansService.getLoans(req.query);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };

  getLoanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const application = await this.loansService.getLoanById(req.params.id as string);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const application = await this.loansService.updateStatus(req.params.id as string, req.body, executorId);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  assignApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const application = await this.loansService.assignApplication(req.params.id as string, req.body, executorId);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  updateApplication = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const application = await this.loansService.updateApplication(req.params.id as string, req.body, executorId);
      sendResponse(res, 200, { application });
    } catch (error) {
      next(error);
    }
  };

  getDocuments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const documents = await this.loansService.getDocuments(req.params.id as string);
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

      const dto: import('../dto/loans.dto').UploadDocumentDto = {
        loanId: req.params.id as string,
        category: req.body.category,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      // executorId is optional for public facing uploads, but let's assume it exists if they are authenticated.
      // If it's a public form, auth middleware won't be applied to this route, so req.user might be undefined.
      const executorId = req.user?.id || 'SYSTEM';

      const document = await this.loansService.uploadDocument(dto, executorId);
      sendResponse(res, 201, { document });
    } catch (error) {
      next(error);
    }
  };

  verifyDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const document = await this.loansService.verifyDocument(req.params.id as string, req.params.documentId as string, req.body, executorId);
      sendResponse(res, 200, { document });
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const executorId = req.user!.id as string;
      const note = await this.loansService.addNote(req.params.id as string, req.body, executorId);
      sendResponse(res, 201, { note });
    } catch (error) {
      next(error);
    }
  };
}
