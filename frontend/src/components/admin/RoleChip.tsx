import type { AdminRole } from '@/lib/adminRbac';

interface RoleChipProps {
  role: AdminRole;
  label: string;
}

const roleClassMap: Record<AdminRole, string> = {
  SUPER_ADMIN: 'bg-red-50 text-red-700',
  BRANCH_MANAGER: 'bg-indigo-50 text-indigo-700',
  MEMBERSHIP_OFFICER: 'bg-blue-50 text-blue-700',
  LOAN_OFFICER: 'bg-cyan-50 text-cyan-700',
  KYC_OFFICER: 'bg-amber-50 text-amber-700',
  CONTENT_ADMIN: 'bg-emerald-50 text-emerald-700',
};

export default function RoleChip({ role, label }: RoleChipProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${roleClassMap[role]}`}>
      {label}
    </span>
  );
}
