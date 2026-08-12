import { SettingsRepository } from '../repositories/settings.repository';
import { SETTINGS_CONSTANTS } from '../constants/settings.constants';
import { ISystemSettings, IFeatureFlags } from '../interfaces/settings.interface';
import { UpdateSystemSettingsDto, UpdateFeatureFlagsDto, UpdateAccessControlDto } from '../dto/settings.dto';
import { AppError } from '../../../common/errors/AppError';
import { AdminRole } from '@prisma/client';

export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  private parseBoolean(val: string | undefined, fallback: boolean): boolean {
    if (!val) return fallback;
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
    return fallback;
  }

  async getSystemSettings(): Promise<ISystemSettings> {
    const rows = await this.settingsRepository.getSettings();
    const map = new Map(rows.map(r => [r.key, r.value]));

    const automatedAssignment = map.get('automatedAssignment');
    const loanApprovalThreshold = Number(map.get('loanApprovalThreshold'));
    
    return {
      organizationName: map.get('organizationName') || 'Zemen Saving and Credit Cooperative',
      contactEmail: map.get('contactEmail') || 'info@zemensacco.com',
      primaryPhone: map.get('primaryPhone') || '+251953444411',
      automatedAssignment: (automatedAssignment === 'ROUND_ROBIN' || automatedAssignment === 'BRANCH_POOL' || automatedAssignment === 'MANUAL') 
        ? automatedAssignment 
        : SETTINGS_CONSTANTS.DEFAULTS.automatedAssignment as any,
      loanApprovalThreshold: Number.isFinite(loanApprovalThreshold) 
        ? loanApprovalThreshold 
        : SETTINGS_CONSTANTS.DEFAULTS.loanApprovalThreshold,
      complianceLock: this.parseBoolean(map.get('complianceLock'), SETTINGS_CONSTANTS.DEFAULTS.complianceLock),
      dualControlEnabled: this.parseBoolean(map.get('dualControlEnabled'), SETTINGS_CONSTANTS.DEFAULTS.dualControlEnabled),
      kycRequired: this.parseBoolean(map.get('kycRequired'), true),
      allowResubmission: this.parseBoolean(map.get('allowResubmission'), false),
      autoAssign: this.parseBoolean(map.get('autoAssign'), true),
    };
  }

  async updateSystemSettings(dto: UpdateSystemSettingsDto, executorId: string): Promise<ISystemSettings> {
    const current = await this.getSystemSettings();
    
    if (dto.automatedAssignment !== undefined) {
      await this.settingsRepository.setSetting('automatedAssignment', dto.automatedAssignment);
    }
    if (dto.loanApprovalThreshold !== undefined) {
      await this.settingsRepository.setSetting('loanApprovalThreshold', String(dto.loanApprovalThreshold));
    }
    if (dto.complianceLock !== undefined) {
      await this.settingsRepository.setSetting('complianceLock', String(dto.complianceLock));
    }
    if (dto.dualControlEnabled !== undefined) {
      await this.settingsRepository.setSetting('dualControlEnabled', String(dto.dualControlEnabled));
    }
    if (dto.organizationName !== undefined) {
      await this.settingsRepository.setSetting('organizationName', dto.organizationName);
    }
    if (dto.contactEmail !== undefined) {
      await this.settingsRepository.setSetting('contactEmail', dto.contactEmail);
    }
    if (dto.primaryPhone !== undefined) {
      await this.settingsRepository.setSetting('primaryPhone', dto.primaryPhone);
    }
    if (dto.kycRequired !== undefined) {
      await this.settingsRepository.setSetting('kycRequired', String(dto.kycRequired));
    }
    if (dto.allowResubmission !== undefined) {
      await this.settingsRepository.setSetting('allowResubmission', String(dto.allowResubmission));
    }
    if (dto.autoAssign !== undefined) {
      await this.settingsRepository.setSetting('autoAssign', String(dto.autoAssign));
    }

    await this.settingsRepository.createAuditLog({
      userId: executorId,
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetType: 'SystemSettings',
      details: 'Updated global system settings'
    });

    return this.getSystemSettings();
  }

  async getFeatureFlags(): Promise<IFeatureFlags> {
    const rows = await this.settingsRepository.getSettings(SETTINGS_CONSTANTS.KEYS.FEATURE_PREFIX);
    const map = new Map(rows.map(r => [r.key, r.value]));

    return {
      enableBackgroundExportQueue: this.parseBoolean(map.get(`${SETTINGS_CONSTANTS.KEYS.FEATURE_PREFIX}enableBackgroundExportQueue`), true),
      enableSloDashboard: this.parseBoolean(map.get(`${SETTINGS_CONSTANTS.KEYS.FEATURE_PREFIX}enableSloDashboard`), true),
      enableAuditPolicyDashboard: this.parseBoolean(map.get(`${SETTINGS_CONSTANTS.KEYS.FEATURE_PREFIX}enableAuditPolicyDashboard`), true),
      enableStrictSensitiveDataPolicy: this.parseBoolean(map.get(`${SETTINGS_CONSTANTS.KEYS.FEATURE_PREFIX}enableStrictSensitiveDataPolicy`), true),
    };
  }

  async updateFeatureFlags(dto: UpdateFeatureFlagsDto, executorId: string): Promise<IFeatureFlags> {
    for (const [key, value] of Object.entries(dto)) {
      if (typeof value === 'boolean') {
        await this.settingsRepository.setSetting(`${SETTINGS_CONSTANTS.KEYS.FEATURE_PREFIX}${key}`, String(value));
      }
    }

    await this.settingsRepository.createAuditLog({
      userId: executorId,
      action: 'FEATURE_FLAGS_UPDATED',
      targetType: 'FeatureFlags',
      details: 'Updated feature flags'
    });

    return this.getFeatureFlags();
  }


}
