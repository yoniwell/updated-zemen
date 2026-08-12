import { Request, Response, NextFunction } from 'express';
import { TypesConfigService } from '../services/types-config.service';

export class TypesConfigController {
  constructor(private typesConfigService: TypesConfigService) {}

  // Saving Types
  getAllSavingTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const savingTypes = await this.typesConfigService.getAllSavingTypes(includeInactive);
      res.json({ savingTypes });
    } catch (error) {
      next(error);
    }
  };

  createSavingType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const savingType = await this.typesConfigService.createSavingType(req.body);
      res.status(201).json({ savingType, message: 'Saving type created successfully' });
    } catch (error) {
      next(error);
    }
  };

  updateSavingType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const savingType = await this.typesConfigService.updateSavingType(String(req.params.id), req.body);
      res.json({ savingType, message: 'Saving type updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  deleteSavingType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.typesConfigService.deleteSavingType(String(req.params.id));
      res.json({ message: 'Saving type deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  // Loan Types
  getAllLoanTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const loanTypes = await this.typesConfigService.getAllLoanTypes(includeInactive);
      res.json({ loanTypes });
    } catch (error) {
      next(error);
    }
  };

  createLoanType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loanType = await this.typesConfigService.createLoanType(req.body);
      res.status(201).json({ loanType, message: 'Loan type created successfully' });
    } catch (error) {
      next(error);
    }
  };

  updateLoanType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loanType = await this.typesConfigService.updateLoanType(String(req.params.id), req.body);
      res.json({ loanType, message: 'Loan type updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  deleteLoanType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.typesConfigService.deleteLoanType(String(req.params.id));
      res.json({ message: 'Loan type deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}
