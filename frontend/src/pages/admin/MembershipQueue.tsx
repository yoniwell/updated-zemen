import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { MEMBERSHIP_QUEUE_STATUS_OPTIONS } from '@/lib/adminOptions';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';
import { useAdminI18n } from '@/lib/uiI18n';
import { AlertTriangle } from 'lucide-react';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
type MembershipQueueApplication = {
  id: string;
  referenceNo: string;
  status: string;
  submittedAt?: string | null;
  updatedAt: string;
  applicantType: string;
  applicant: {
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    phone: string;
  };
  branch?: {
    name: string;
  } | null;
  assignedTo?: {
    name: string;
  } | null;
  documents: Array<{
    status: string;
  }>;
  queueMetrics?: {
    ageHours: number;
    ageBucket: 'fresh' | 'aging' | 'stale';
    slaHours: number | null;
    slaBreached: boolean;
    slaRemainingHours: number | null;
    escalation?: {
      escalated: boolean;
      level: 'L1' | 'L2' | 'L3' | null;
      action: string | null;
      thresholdHours: number | null;
    };
  };
};

const formatApplicantName = (applicant: MembershipQueueApplication['applicant']): string => {
  const middle = applicant.middleName || null;
  const last = applicant.lastName || null;
  return [applicant.firstName, middle, last].filter((part) => Boolean(part && part.trim())).join(' ');
};

type MembershipQueueResponse = {
  applications: MembershipQueueApplication[];
  total: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const labelizeStatus = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function MembershipQueue() {
  const { tAdmin } = useAdminI18n();
  const navigate = useNavigate();
  const { branchNames } = useAdminBranches();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [officerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [sortBy] = useState<'createdAt' | 'updatedAt' | 'submittedAt' | 'status' | 'referenceNo'>('createdAt');
  const sortOrder: 'asc' | 'desc' = 'desc';
  
  const [reloadSeq, setReloadSeq] = useState(0);
  const [applications, setApplications] = useState<MembershipQueueApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQueue = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sortBy,
          sortOrder,
        });
        if (search.trim()) params.set('search', search.trim());
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (branchFilter !== 'all') params.set('branchId', branchFilter);
        if (officerFilter !== 'all' && officerFilter !== '—') params.set('assignedToId', officerFilter);

        const response = await adminFetch<MembershipQueueResponse>(`/api/admin/queues/membership?${params.toString()}`);
        setApplications(response.applications);
        const pagination = response.pagination;
        const nextTotal = pagination?.total ?? response.total ?? response.applications.length;
        const nextTotalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(nextTotal / limit));
        setTotal(nextTotal);
        setTotalPages(nextTotalPages);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : tAdmin('failedLoadMembershipQueue', 'Failed to load membership queue'));
      } finally {
        setLoading(false);
      }
    };

    void loadQueue();
  }, [page, limit, sortBy, sortOrder, search, statusFilter, branchFilter, officerFilter, reloadSeq, tAdmin]);

  const branchOptions = useMemo(() => {
    const names = new Set<string>(branchNames);
    applications.forEach((application) => {
      if (application.branch?.name) {
        names.add(application.branch.name);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [applications, branchNames]);

  const filtered = useMemo(() => applications, [applications]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info(tAdmin('noRecordsToExport', 'No records to export'));
      return;
    }

    const header = [
      tAdmin('reference', 'Reference'),
      tAdmin('applicant', 'Applicant'),
      tAdmin('phone', 'Phone'),
      tAdmin('branch', 'Branch'),
      tAdmin('status', 'Status'),
      tAdmin('submittedDate', 'Submitted Date'),
    ];
    const rows = filtered.map((application) => {
      const applicantName = formatApplicantName(application.applicant);
      const submitted = application.submittedAt || application.updatedAt;
      return [
        application.referenceNo,
        applicantName,
        application.applicant.phone,
        application.branch?.name || tAdmin('unassigned', 'Unassigned'),
        application.status,
        new Date(submitted).toLocaleDateString(),
      ];
    });

    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `membership-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="rounded-lg bg-white p-4 text-sm text-slate-600">{tAdmin('loadingMembershipQueue', 'Loading membership queue...')}</p>;
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        <button
          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700"
          onClick={() => setReloadSeq((prev) => prev + 1)}
        >
          {tAdmin('retry', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{tAdmin('membershipApplications', 'Membership Applications')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tAdmin('applicationsCount', '{{count}} applications', { count: total })}</p>
        </div>
        <button className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> {tAdmin('exportCsv', 'Export CSV')}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr>
              <th colSpan={8} className="p-4 font-normal">
                <div className="flex flex-wrap gap-3 text-sm font-normal">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                      placeholder={tAdmin('searchByNamePhoneOrReference', 'Search by name, phone, or reference...')}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>

                  <select className="h-9 w-[160px] rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">{tAdmin('allStatuses', 'All Statuses')}</option>
                    {MEMBERSHIP_QUEUE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{labelizeStatus(status)}</option>
                    ))}
                  </select>

                  <select className="h-9 w-[140px] rounded-md border border-input bg-background px-3 text-sm" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                    <option value="all">{tAdmin('allBranches', 'All Branches')}</option>
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
              </th>
            </tr>

            <tr>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('reference', 'Reference')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('applicant', 'Applicant')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('branch', 'Branch')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('status', 'Status')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('date', 'Date')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('missingDocs', 'Missing Docs')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('updated', 'Updated')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{tAdmin('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((application) => {
              const applicantName = formatApplicantName(application.applicant);
              const branchName = application.branch?.name || '—';
              const missingDocs = application.documents.filter((doc) => doc.status !== 'VERIFIED').length;
              const displayDate = application.submittedAt || application.updatedAt;
              
              
              return (
              <tr key={application.id} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 last:border-0 px-3" onClick={() => navigate(`/admin/applications/membership/${application.id}`)}>
                <td className="p-3 align-middle text-xs font-medium text-primary break-words">{application.referenceNo}</td>
                <td className="p-3 align-middle">
                  <div className="text-xs font-medium leading-tight text-foreground break-words">{applicantName}</div>
                  <div className="text-[11px] leading-tight text-muted-foreground break-words">{application.applicant.phone}</div>
                </td>
                <td className="p-3 align-middle text-xs text-muted-foreground break-words">{branchName}</td>
                <td className="p-3 align-middle"><StatusBadge status={application.status} /></td>
                <td className="p-3 align-middle text-xs text-muted-foreground break-words">{new Date(displayDate).toLocaleDateString()}</td>
                <td className="p-3 align-middle">
                  {missingDocs > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="h-3 w-3" />
                      {missingDocs}
                    </span>
                  ) : (
                    <span className="text-xs text-success">✓</span>
                  )}
                </td>
                <td className="p-3 align-middle text-xs text-muted-foreground break-words">{new Date(application.updatedAt).toLocaleString()}</td>
                <td className="p-3 align-middle" onClick={(event) => event.stopPropagation()}>
                  <Button asChild variant="outline" size="sm" className="gap-1.5" title={tAdmin('viewDetails', 'View Details')}>
                    <Link to={`/admin/applications/membership/${application.id}`}>
                      <Info className="h-4 w-4" />
                      {tAdmin('details', 'Details')}
                    </Link>
                  </Button>
                </td>
              </tr>
            );})}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-muted-foreground rounded-b-2xl">
          <p>{tAdmin('pageOf', 'Page {{page}} / {{totalPages}}', { page, totalPages: Math.max(1, totalPages) })}</p>
          <div className="flex items-center gap-2">
            <button className="h-8 rounded-md border border-input bg-background px-3" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>{tAdmin('previous', 'Previous')}</button>
            <button className="h-8 rounded-md border border-input bg-background px-3" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>{tAdmin('next', 'Next')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
