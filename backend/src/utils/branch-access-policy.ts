type Role =
  | 'SUPER_ADMIN'
  | 'BRANCH_MANAGER'
  | 'MEMBERSHIP_OFFICER'
  | 'LOAN_OFFICER'
  | 'KYC_OFFICER'
  | 'CONTENT_ADMIN';

export type BranchAccessInput = {
  role: Role;
  userBranchId: string | null;
  targetBranchId: string | null;
};

export type BranchAccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'MISSING_USER_BRANCH' | 'CROSS_BRANCH_FORBIDDEN' };

export function evaluateBranchAccessPolicy(input: BranchAccessInput): BranchAccessResult {
  if (input.role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  if (!input.userBranchId) {
    return { allowed: false, reason: 'MISSING_USER_BRANCH' };
  }

  if (input.targetBranchId && input.targetBranchId !== input.userBranchId) {
    return { allowed: false, reason: 'CROSS_BRANCH_FORBIDDEN' };
  }

  return { allowed: true };
}
