import { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
}

export default function KPICard({ label, value, hint, icon }: KPICardProps) {
  return (
    <article className="rounded-xl bg-white p-4 font-serif">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-blue-950">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </article>
  );
}
