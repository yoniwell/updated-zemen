export interface ISystemSettings {
  organizationName: string;
  contactEmail: string;
  primaryPhone: string;
  automatedAssignment: 'ROUND_ROBIN' | 'BRANCH_POOL' | 'MANUAL';
  loanApprovalThreshold: number;
  complianceLock: boolean;
  dualControlEnabled: boolean;
  kycRequired: boolean;
  allowResubmission: boolean;
  autoAssign: boolean;
}

export interface IFeatureFlags {
  enableBackgroundExportQueue: boolean;
  enableSloDashboard: boolean;
  enableAuditPolicyDashboard: boolean;
  enableStrictSensitiveDataPolicy: boolean;
}

export interface IBranchResponse {
  id: string;
  name: string;
  code: string;
  location: string;
  manager: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
