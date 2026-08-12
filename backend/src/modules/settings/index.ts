import { SettingsRepository } from './repositories/settings.repository';
import { BranchRepository } from './repositories/branch.repository';
import { SettingsService } from './services/settings.service';
import { BranchService } from './services/branch.service';
import { SettingsController } from './controllers/settings.controller';
import { BranchController } from './controllers/branch.controller';
import { TypesConfigService } from './services/types-config.service';
import { TypesConfigController } from './controllers/types-config.controller';
import { createSettingsRoutes } from './routes/settings.routes';

const settingsRepository = new SettingsRepository();
const branchRepository = new BranchRepository();

const settingsService = new SettingsService(settingsRepository);
const branchService = new BranchService(branchRepository);

const settingsController = new SettingsController(settingsService);
const branchController = new BranchController(branchService);

const typesConfigService = new TypesConfigService();
const typesConfigController = new TypesConfigController(typesConfigService);

export const settingsRoutes = createSettingsRoutes(settingsController, branchController, typesConfigController);
