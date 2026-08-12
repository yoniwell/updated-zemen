import { AdminRole } from '@prisma/client';
import { ISystemSettings, IFeatureFlags } from '../interfaces/settings.interface';

export interface UpdateSystemSettingsDto extends Partial<ISystemSettings> {}
export interface UpdateFeatureFlagsDto extends Partial<IFeatureFlags> {}

export interface UpdateAccessControlDto {
  modules: string[];
}

export interface CreateBranchDto {
  name: string;
  code: string;
  location: string;
  manager?: string | null;
  status?: string;
  officeHours?: string | null;
  mapUrl?: string | null;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  published?: boolean;
}

export interface UpdateBranchDto extends Partial<CreateBranchDto> {}
