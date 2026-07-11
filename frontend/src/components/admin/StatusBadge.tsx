import { AlertCircle, AlertTriangle, CheckCircle2, CircleDashed, Clock3, FileWarning, ShieldCheck, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'critical' | 'warning' | 'info' | 'success' | string;
  showCode?: boolean;
}

type StatusMeta = {
  className: string;
  icon: typeof CheckCircle2;
};

const statusMetaMap: Record<string, StatusMeta> = {
  active: { className: 'bg-emerald-50 text-emerald-700', icon: ShieldCheck },
  inactive: { className: 'bg-slate-100 text-slate-700', icon: CircleDashed },
  approved: { className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  activated: { className: 'bg-emerald-50 text-emerald-700', icon: ShieldCheck },
  verified: { className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  published: { className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  operational: { className: 'bg-emerald-50 text-emerald-700', icon: ShieldCheck },
  sent: { className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },

  unread: { className: 'bg-blue-50 text-blue-700', icon: AlertCircle },
  read: { className: 'bg-slate-100 text-slate-700', icon: CircleDashed },
  submitted: { className: 'bg-blue-50 text-blue-700', icon: CircleDashed },
  under_review: { className: 'bg-sky-50 text-sky-700', icon: Clock3 },
  kyc_verification: { className: 'bg-indigo-50 text-indigo-700', icon: ShieldCheck },
  pending_documents: { className: 'bg-amber-50 text-amber-700', icon: FileWarning },
  pending_clarification: { className: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
  pending: { className: 'bg-amber-50 text-amber-700', icon: Clock3 },
  flagged: { className: 'bg-orange-50 text-orange-700', icon: AlertTriangle },
  warning: { className: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
  info: { className: 'bg-blue-50 text-blue-700', icon: AlertCircle },

  rejected: { className: 'bg-red-50 text-red-700', icon: XCircle },
  failed: { className: 'bg-red-50 text-red-700', icon: XCircle },
  expired: { className: 'bg-rose-50 text-rose-700', icon: XCircle },
  critical: { className: 'bg-red-50 text-red-700', icon: AlertCircle },

  draft: { className: 'bg-slate-100 text-slate-700', icon: CircleDashed },
  success: { className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
};

const labelizeStatus = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function StatusBadge({ status, showCode = false }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const meta = statusMetaMap[normalized] ?? {
    className: 'bg-slate-100 text-slate-700',
    icon: CircleDashed,
  };
  const Icon = meta.icon;

  return (
    <span className={[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
      meta.className,
    ].join(' ')}>
      <Icon className="h-3.5 w-3.5" />
      <span>{labelizeStatus(status)}</span>
      {showCode ? <span className="opacity-70">[{status}]</span> : null}
    </span>
  );
}
