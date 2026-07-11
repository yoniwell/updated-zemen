import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { MEMBERSHIP_QUEUE_STATUS_OPTIONS, LOAN_QUEUE_STATUS_OPTIONS } from '@/lib/adminOptions';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { adminFetch } from '@/lib/adminApi';

type QueueApplication = {
  id: string;
  status: string;
  submittedAt?: string | null;
  updatedAt: string;
};

type QueueResponse = {
  applications: QueueApplication[];
};

type ApprovedApplication = {
  id: string;
  status: string;
  submittedAt?: string | null;
  updatedAt: string;
};

type ApprovedResponse = {
  applications: ApprovedApplication[];
};

type DailyRow = {
  dayKey: string;
  dayLabel: string;
  received: number;
  membershipReceived: number;
  loanReceived: number;
  approved: number;
  rejected: number;
};

const DAILY_WINDOW_DAYS = 14;

const dailyTrendChartConfig = {
  received: { label: 'Received', color: 'hsl(214 84% 56%)' },
  approved: { label: 'Approved', color: 'hsl(158 64% 42%)' },
  rejected: { label: 'Rejected', color: 'hsl(0 73% 52%)' },
} as const;

const productMixChartConfig = {
  membershipReceived: { label: 'Membership', color: 'hsl(188 95% 42%)' },
  loanReceived: { label: 'Loan', color: 'hsl(271 81% 62%)' },
} as const;

const toDayKey = (value: string): string => {
  const parsed = new Date(value);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const readableDate = (dayKey: string): string => {
  const value = new Date(`${dayKey}T00:00:00`);
  return value.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

const sumOf = (rows: DailyRow[], key: keyof DailyRow): number => rows.reduce((total, row) => total + Number(row[key] || 0), 0);

export default function AdminDashboard() {
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const buildDailyTemplate = useCallback((): DailyRow[] => {
    const today = new Date();
    const rows: DailyRow[] = [];

    for (let index = DAILY_WINDOW_DAYS - 1; index >= 0; index -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - index);
      const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      rows.push({
        dayKey,
        dayLabel: readableDate(dayKey),
        received: 0,
        membershipReceived: 0,
        loanReceived: 0,
        approved: 0,
        rejected: 0,
      });
    }

    return rows;
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);

    const membershipStatuses = MEMBERSHIP_QUEUE_STATUS_OPTIONS.join(',');
    const loanStatuses = LOAN_QUEUE_STATUS_OPTIONS.join(',');

    const [membershipQueueResult, loanQueueResult, approvedMembershipResult, approvedLoanResult] = await Promise.allSettled([
      adminFetch<QueueResponse>(`/api/admin/queues/membership?page=1&limit=250&status=${membershipStatuses}&sortBy=submittedAt&sortOrder=desc`),
      adminFetch<QueueResponse>(`/api/admin/queues/loan?page=1&limit=250&status=${loanStatuses}&sortBy=submittedAt&sortOrder=desc`),
      adminFetch<ApprovedResponse>('/api/membership?page=1&limit=250&status=APPROVED,ACTIVATED&sortBy=updatedAt&sortOrder=desc'),
      adminFetch<ApprovedResponse>('/api/loans?page=1&limit=250&status=APPROVED,ACTIVATED&sortBy=updatedAt&sortOrder=desc'),
    ]);

    const template = buildDailyTemplate();
    const rowsByDay = new Map(template.map((row) => [row.dayKey, row]));

    const markReceived = (application: QueueApplication, key: 'membershipReceived' | 'loanReceived') => {
      const dayKey = toDayKey(application.submittedAt || application.updatedAt);
      const row = rowsByDay.get(dayKey);
      if (!row) return;
      row.received += 1;
      row[key] += 1;
      if (application.status === 'REJECTED') {
        row.rejected += 1;
      }
    };

    const markApproved = (application: ApprovedApplication) => {
      const dayKey = toDayKey(application.updatedAt || application.submittedAt || new Date().toISOString());
      const row = rowsByDay.get(dayKey);
      if (!row) return;
      row.approved += 1;
    };

    if (membershipQueueResult.status === 'fulfilled') {
      membershipQueueResult.value.applications.forEach((application) => markReceived(application, 'membershipReceived'));
    }

    if (loanQueueResult.status === 'fulfilled') {
      loanQueueResult.value.applications.forEach((application) => markReceived(application, 'loanReceived'));
    }

    if (approvedMembershipResult.status === 'fulfilled') {
      approvedMembershipResult.value.applications.forEach(markApproved);
    }

    if (approvedLoanResult.status === 'fulfilled') {
      approvedLoanResult.value.applications.forEach(markApproved);
    }

    setDailyRows(template);
    setLoading(false);
  }, [buildDailyTemplate]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const totalReceived = useMemo(() => sumOf(dailyRows, 'received'), [dailyRows]);
  const totalApproved = useMemo(() => sumOf(dailyRows, 'approved'), [dailyRows]);
  const totalRejected = useMemo(() => sumOf(dailyRows, 'rejected'), [dailyRows]);
  const todayRow = dailyRows[dailyRows.length - 1];
  const decisionDenominator = totalApproved + totalRejected;
  const approvalRate = decisionDenominator > 0 ? Math.round((totalApproved / decisionDenominator) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#0f766e_100%)] p-6 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.9)]">
        <div className="flex justify-end">
          <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => void loadReports()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh report
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Applications received</p>
          <p className="mt-2 text-3xl font-black text-blue-900">{totalReceived.toLocaleString()}</p>
          <p className="mt-1 text-xs text-blue-700">Last {DAILY_WINDOW_DAYS} days</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Approved</p>
          <p className="mt-2 text-3xl font-black text-emerald-900">{totalApproved.toLocaleString()}</p>
          <p className="mt-1 text-xs text-emerald-700">Approval rate: {approvalRate}%</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">Rejected</p>
          <p className="mt-2 text-3xl font-black text-rose-900">{totalRejected.toLocaleString()}</p>
          <p className="mt-1 text-xs text-rose-700">From queue decisions</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Today</p>
          <p className="mt-2 text-3xl font-black text-violet-900">{todayRow ? todayRow.received.toLocaleString() : '0'}</p>
          <p className="mt-1 text-xs text-violet-700">Applications received today</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Daily flow</p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">Received vs approved vs rejected</h2>
            </div>
            <CalendarDays className="h-5 w-5 text-slate-500" />
          </div>

          <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[hsl(214_84%_56%)]" /> Received
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[hsl(158_64%_42%)]" /> Approved
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[hsl(0_73%_52%)]" /> Rejected
            </span>
          </div>

          <ChartContainer config={dailyTrendChartConfig} className="h-[320px] w-full rounded-2xl bg-slate-50 p-3">
            <AreaChart data={dailyRows}>
              <defs>
                <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(214 84% 56%)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(214 84% 56%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158 64% 42%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(158 64% 42%)" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="rejectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 73% 52%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(0 73% 52%)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area type="monotone" dataKey="received" stroke="hsl(214 84% 56%)" fill="url(#receivedGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="approved" stroke="hsl(158 64% 42%)" fill="url(#approvedGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="rejected" stroke="hsl(0 73% 52%)" fill="url(#rejectedGradient)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Application type mix</p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">Membership and loan each day</h2>
            </div>
            <Layers className="h-5 w-5 text-slate-500" />
          </div>

          <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[hsl(188_95%_42%)]" /> Membership
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-[hsl(271_81%_62%)]" /> Loan
            </span>
          </div>

          <ChartContainer config={productMixChartConfig} className="h-[320px] w-full rounded-2xl bg-slate-50 p-3">
            <BarChart data={dailyRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
              <Bar dataKey="membershipReceived" stackId="mix" fill="hsl(188 95% 42%)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="loanReceived" stackId="mix" fill="hsl(271 81% 62%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Day-by-day table</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">Simple daily performance report</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            <Clock3 className="h-3.5 w-3.5" />
            Updated from live queues
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Day</th>
                <th className="px-3 py-2 text-left">Received</th>
                <th className="px-3 py-2 text-left">Membership</th>
                <th className="px-3 py-2 text-left">Loan</th>
                <th className="px-3 py-2 text-left">Approved</th>
                <th className="px-3 py-2 text-left">Rejected</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((row) => (
                <tr key={row.dayKey} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-900">{row.dayLabel}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-slate-700">{row.received.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-cyan-700">{row.membershipReceived.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-violet-700">{row.loanReceived.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-emerald-700">{row.approved.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-rose-700">{row.rejected.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
            <p className="text-xs font-black uppercase tracking-[0.18em]">Healthy signal</p>
            <p className="mt-1 text-sm">{approvalRate >= 70 ? 'Approval flow is stable this period.' : 'Approval flow is below the normal target.'}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-800">
            <p className="text-xs font-black uppercase tracking-[0.18em]">Business trend</p>
            <p className="mt-1 text-sm">{(todayRow?.received || 0) > 0 ? `${todayRow?.received} applications came in today.` : 'No new applications yet today.'}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <p className="text-xs font-black uppercase tracking-[0.18em]">Attention point</p>
            <p className="mt-1 text-sm">{totalRejected > 0 ? `${totalRejected} rejected items appeared in the last ${DAILY_WINDOW_DAYS} days.` : 'No rejections in this reporting window.'}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
