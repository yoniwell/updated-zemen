import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { BranchController } from '../controllers/branch.controller';
import { validate } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { updateSystemSettingsSchema, updateFeatureFlagsSchema, updateAccessControlSchema, createBranchSchema, updateBranchSchema } from '../validation/settings.schema';
import { createTypeConfigSchema, updateTypeConfigSchema } from '../validation/types-config.schema';
import { AppError } from '../../../common/errors/AppError';
import { TypesConfigController } from '../controllers/types-config.controller';

const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
};

export const createSettingsRoutes = (
  settingsController: SettingsController, 
  branchController: BranchController,
  typesConfigController: TypesConfigController
): Router => {
  const router = Router();
  
  // Branches (Public Read)
  router.get('/branches', branchController.getAllBranches);

  // Config Types (Public Read)
  router.get('/saving-types', typesConfigController.getAllSavingTypes);
  router.get('/loan-types', typesConfigController.getAllLoanTypes);
  
  router.use(authenticate);

  // System Settings
  router.get('/system', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), settingsController.getSystemSettings);
  router.patch('/system', authorize('SUPER_ADMIN'), validate({ body: updateSystemSettingsSchema }), settingsController.updateSystemSettings);

  // Feature Flags
  router.get('/feature-flags', authorize('SUPER_ADMIN', 'BRANCH_MANAGER'), settingsController.getFeatureFlags);
  router.patch('/feature-flags', authorize('SUPER_ADMIN'), validate({ body: updateFeatureFlagsSchema }), settingsController.updateFeatureFlags);



  // Branches (Manage)

  router.post('/branches', authorize('SUPER_ADMIN'), validate({ body: createBranchSchema }), branchController.createBranch);
  router.patch('/branches/:id', authorize('SUPER_ADMIN'), validate({ body: updateBranchSchema }), branchController.updateBranch);
  router.delete('/branches/:id', authorize('SUPER_ADMIN'), branchController.deleteBranch);

  // Saving Types (Manage)
  router.post('/saving-types', authorize('SUPER_ADMIN'), validate({ body: createTypeConfigSchema }), typesConfigController.createSavingType);
  router.patch('/saving-types/:id', authorize('SUPER_ADMIN'), validate({ body: updateTypeConfigSchema }), typesConfigController.updateSavingType);
  router.delete('/saving-types/:id', authorize('SUPER_ADMIN'), typesConfigController.deleteSavingType);

  // Loan Types (Manage)
  router.post('/loan-types', authorize('SUPER_ADMIN'), validate({ body: createTypeConfigSchema }), typesConfigController.createLoanType);
  router.patch('/loan-types/:id', authorize('SUPER_ADMIN'), validate({ body: updateTypeConfigSchema }), typesConfigController.updateLoanType);
  router.delete('/loan-types/:id', authorize('SUPER_ADMIN'), typesConfigController.deleteLoanType);

  return router;
};
