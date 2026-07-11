import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { formatDateTime as formatLocaleDateTime } from '@/lib/locale';
import { useAdminI18n } from '@/lib/uiI18n';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface AuditEvent {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
    branch: { id: string; name: string; code: string } | null;
  };
}

interface AuditResponse {
  events: AuditEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

interface AuditDashboardResponse {
  asOf: string;
  summary: {
    total24h: number;
    permissionFailures: number;
    policyExceptions: number;
    suspiciousIpCount: number;
  };
  suspiciousIps: Array<{ ipAddress: string | null; eventCount: number }>;
}

const userManagementActions = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_PASSWORD_RESET',
  'USER_DEACTIVATED',
] as const;

const formatDateTime = (value: string): string => {
  return formatLocaleDateTime(value);
};

export default function AuditLog() {
  const tAdmin = useAdminI18n();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'USER_MANAGEMENT' | string>('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | string>('ALL');
  const [dashboard, setDashboard] = useState<AuditDashboardResponse | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set('search', search.trim());
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (entityFilter !== 'ALL') params.set('entity', entityFilter);

      const response = await adminFetch<AuditResponse>(`/api/admin/audit-logs?${params.toString()}`);
      setEvents(response.events);
      setTotal(response.pagination?.total ?? response.events.length);

      const dashboardResponse = await adminFetch<AuditDashboardResponse>('/api/admin/audit-logs/dashboard');
      setDashboard(dashboardResponse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tAdmin('failedToLoadAuditLogs'));
    } finally {
      setLoading(false);
    }
  }, [tAdmin, page, limit, search, actionFilter, entityFilter]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (actionFilter === 'USER_MANAGEMENT' && !userManagementActions.includes(event.action as (typeof userManagementActions)[number])) {
        return false;
      }

      if (actionFilter !== 'ALL' && actionFilter !== 'USER_MANAGEMENT' && event.action !== actionFilter) {
        return false;
      }

      if (entityFilter !== 'ALL' && event.targetType !== entityFilter) {
        return false;
      }

      if (search.trim()) {
        const haystack = `${event.user.name} ${event.action} ${event.details || ''} ${event.targetType} ${event.targetId || ''}`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [events, actionFilter, entityFilter, search]);

  const uniqueActions = useMemo(() => Array.from(new Set(events.map((event) => event.action))).sort(), [events]);
  const uniqueEntities = useMemo(() => Array.from(new Set(events.map((event) => event.targetType))).sort(), [events]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info(tAdmin('noEntriesToExport'));
      return;
    }

    const header = [tAdmin('user'), tAdmin('role'), tAdmin('action'), tAdmin('entity'), tAdmin('targetId'), tAdmin('details'), tAdmin('timestamp')];
    const rows = filtered.map((event) => [
      event.user.name,
      event.user.role,
      event.action,
      event.targetType,
      event.targetId || '',
      event.ipAddress || '',
      event.createdAt,
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(tAdmin('auditLogExported'));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground">{tAdmin('auditLogHeading')}</h1>
          <p className="text-sm text-muted-foreground">{tAdmin('auditLogSubheading')}</p>

          <div className="mt-3 flex gap-8">
            <div>
              <p className="text-xs uppercase text-muted-foreground">{tAdmin('eventsLast24h')}</p>
              <p className="text-2xl font-bold">{dashboard?.summary.total24h ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">{tAdmin('permissionFailures')}</p>
              <p className="text-2xl font-bold">{dashboard?.summary.permissionFailures ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">{tAdmin('policyExceptions')}</p>
              <p className="text-2xl font-bold">{dashboard?.summary.policyExceptions ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">{tAdmin('suspiciousIps')}</p>
              <p className="text-2xl font-bold">{dashboard?.summary.suspiciousIpCount ?? '-'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadAudit()} disabled={loading}>{tAdmin('refresh')}</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> {tAdmin('export')}</Button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={tAdmin('searchAuditPlaceholder', 'Search user, action, target, or details...')} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <div className="mt-3 flex gap-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder={tAdmin('eventType', 'Event type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{tAdmin('allActions')}</SelectItem>
                <SelectItem value="USER_MANAGEMENT">{tAdmin('userManagementEvents')}</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder={tAdmin('affectedArea', 'Affected area')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{tAdmin('allEntities')}</SelectItem>
                {uniqueEntities.map((entity) => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <table className="min-w-[860px] w-full table-fixed text-xs [&_td]:whitespace-normal [&_td]:break-words">
          <thead>
            <tr>
              <th className="w-[18%] p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('user', 'User')}</th>
              <th className="w-[18%] p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('event', 'Event')}</th>
              <th className="w-[14%] p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('area', 'Area')}</th>
              <th className="w-[30%] p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('details', 'Details')}</th>
              <th className="w-[20%] p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('timestamp', 'Time')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3 text-sm text-muted-foreground" colSpan={6}>{tAdmin('loadingAuditLog')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-3 text-sm text-muted-foreground" colSpan={6}>{tAdmin('noEventsFound')}</td></tr>
            ) : (
              filtered.map((event) => (
                <tr key={event.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                  <td className="p-2">
                    <p className="text-xs font-semibold text-foreground">{event.user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{event.user.role}</p>
                  </td>
                  <td className="p-2 text-xs font-semibold text-foreground">{event.action}</td>
                  <td className="p-2 text-xs text-muted-foreground">{event.targetType}</td>
                  <td className="p-2 text-xs text-slate-700">{event.details || '-'}</td>
                  <td className="p-2 text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-muted-foreground rounded-b-2xl mt-3">
        <p>{tAdmin('pageOf', 'Page {{page}} / {{totalPages}}', { page, totalPages })} — {tAdmin('total', 'Total')}: {total}</p>
        <div className="flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(value) => { setLimit(Number(value)); setPage(1); }}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>{tAdmin('previous', 'Previous')}</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>{tAdmin('next', 'Next')}</Button>
        </div>
      </div>
    </div>
  );
}
