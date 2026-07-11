import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/adminApi';
import { LOAN_QUEUE_STATUS_OPTIONS, LOAN_TYPE_OPTIONS } from '@/lib/adminOptions';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminI18n } from '@/lib/uiI18n';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { SelectTrigger, SelectValue, SelectContent, SelectItem } from '@radix-ui/react-select';
import { Download, Search, AlertTriangle, Info } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { useNavigate, Link } from 'react-router-dom';

type LoanQueueApplication = {
  id: string;
  referenceNo: string;
  membershipNo?: string | null;
  status: string;
  loanType?: string | null;
  amount?: number | null;
  submittedAt?: string | null;
  updatedAt: string;
  applicant: {
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
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

const formatApplicantName = (applicant: LoanQueueApplication['applicant']): string => {
  const middle = applicant.middleName || null;
  const last = applicant.lastName || null;
  return [applicant.firstName, middle, last].filter((part) => Boolean(part && part.trim())).join(' ');
};

type LoanQueueResponse = {
  applications: LoanQueueApplication[];
  total: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const loanTypeLabels: Record<string, string> = {
  REGULAR_LOAN: 'Regular Loan',
  SPECIAL_SHORT_TERM_LOAN: 'Special Short Term Loan',
  SHORT_TERM_LOAN: 'Short Term Loan',
  INTERMEDIATE_TERM_LOAN: 'Intermediate Term Loan',
  LONG_TERM_LOAN: 'Long Term Loan',
  NON_INTERESTS_LOAN: 'Non-Interest Loan',
  VEHICLES_AND_HOUSE_LOAN: 'Vehicles & House Loan',
};

const labelizeStatus = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const riskColors: Record<string, string> = {
  Low: 'text-success',
  Medium: 'text-warning',
  High: 'text-accent',
};

export default function LoanQueue() {
  const t = useAdminI18n();
  const navigate = useNavigate();
  const { branchNames } = useAdminBranches();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [sortBy] = useState<'createdAt' | 'updatedAt' | 'submittedAt' | 'status' | 'referenceNo' | 'amount' | 'loanType'>('createdAt');
  const sortOrder: 'asc' | 'desc' = 'desc';
  const [reloadSeq, setReloadSeq] = useState(0);
  const [applications, setApplications] = useState<LoanQueueApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
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
      if (productFilter !== 'all') params.set('loanType', productFilter);
      if (branchFilter !== 'all') params.set('branchId', branchFilter);

      const response = await adminFetch<LoanQueueResponse>(`/api/admin/queues/loan?${params.toString()}`);
      setApplications(response.applications);
      const pagination = response.pagination;
      const nextTotal = pagination?.total ?? response.total ?? response.applications.length;
      const nextTotalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(nextTotal / limit));
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('adminLoanQueueLoadFailed', 'Failed to load loan queue'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, search, statusFilter, productFilter, branchFilter, t]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue, reloadSeq]);

  useEffect(() => {
    const handleApplicationUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ applicationType?: string }>;
      if (customEvent.detail?.applicationType && customEvent.detail.applicationType !== 'loan') {
        return;
      }
      void loadQueue();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'admin:application-updated' || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as { applicationType?: string };
        if (!payload.applicationType || payload.applicationType === 'loan') {
          void loadQueue();
        }
      } catch {
        // Ignore invalid payloads.
      }
    };

    const handleFocus = () => {
      void loadQueue();
    };

    window.addEventListener('admin:application-updated', handleApplicationUpdated as EventListener);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('admin:application-updated', handleApplicationUpdated as EventListener);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadQueue]);

  const loanTypeOptions = useMemo(() => {
    const types = new Set<string>(LOAN_TYPE_OPTIONS);
    applications.forEach((application) => {
      if (application.loanType) {
        types.add(application.loanType);
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [applications]);

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
      toast.info(t('noEntriesToExport', 'No entries to export'));
      return;
    }

    const header = ['Reference', 'Applicant', 'Membership No', 'Loan Type', 'Amount', 'Branch', 'Status', 'Submitted Date', 'Risk'];
    const rows = filtered.map((application) => {
      const applicantName = formatApplicantName(application.applicant);
      const missingDocs = application.documents.filter((doc) => doc.status !== 'VERIFIED').length;
      const risk = missingDocs > 1 ? 'High' : missingDocs === 1 ? 'Medium' : 'Low';
      const submitted = application.submittedAt || application.updatedAt;
      return [
        application.referenceNo,
        applicantName,
        application.membershipNo || '-',
        application.loanType ? (loanTypeLabels[application.loanType] || application.loanType) : '-',
        application.amount ? application.amount.toLocaleString() : '-',
        application.branch?.name || t('adminUnassigned', 'Unassigned'),
        application.status,
        new Date(submitted).toLocaleDateString(),
        risk,
      ];
    });

    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loan-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="rounded-lg bg-white p-4 text-sm text-slate-600">{t('adminLoadingLoanQueue', 'Loading loan queue...')}</p>;
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        <button
          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700"
          onClick={() => setReloadSeq((prev) => prev + 1)}
        >
          {t('refresh', 'Refresh')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('adminLoanApplicationsTitle', 'Loan Applications')}</h1>
          <p className="text-sm text-muted-foreground">{total} {t('adminApplicationsLabel', 'applications')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />{t('export', 'Export')} CSV</Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
        <table className="w-full table-auto text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal [&_td]:break-words">
          <thead>
            <tr>
              <th colSpan={10} className="p-4 font-normal">
                <div className="flex flex-wrap gap-3 text-sm font-normal">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder={t('adminLoanQueueSearchPlaceholder', 'Search by name, member no, or reference...')} value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder={t('status', 'Status')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('adminAllStatuses', 'All Statuses')}</SelectItem>
                      {LOAN_QUEUE_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{labelizeStatus(status)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="w-[170px]"><SelectValue placeholder={t('adminLoanTypeLabel', 'Loan Type')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('adminAllTypes', 'All Types')}</SelectItem>
                      {loanTypeOptions.map((loanType) => (
                        <SelectItem key={loanType} value={loanType}>{loanTypeLabels[loanType] || loanType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('branch', 'Branch')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('adminAllBranches', 'All Branches')}</SelectItem>
                      {branchOptions.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </th>
            </tr>

            <tr>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('reference', 'Reference')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('applicant', 'Applicant')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('membershipNo', 'Membership No')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('adminLoanTypeLabel', 'Loan Type')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('amount', 'Amount')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('branch', 'Branch')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('status', 'Status')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('date', 'Date')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('adminRiskLabel', 'Risk')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 border-b border-slate-200">{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((application) => {
              const applicantName = formatApplicantName(application.applicant);
              const missingDocs = application.documents.filter((doc) => doc.status !== 'VERIFIED').length;
              const risk = missingDocs > 1 ? 'High' : missingDocs === 1 ? 'Medium' : 'Low';
              const branchName = application.branch?.name || '—';
              const submitted = application.submittedAt || application.updatedAt;

              return (
                <tr key={application.id} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/70 last:border-0 px-3" onClick={() => navigate(`/admin/applications/loan/${application.id}`)}>
                  <td className="p-3 align-middle text-xs font-medium text-primary break-words">{application.referenceNo}</td>
                  <td className="p-3 align-middle text-xs text-foreground break-words">{applicantName}</td>
                  <td className="p-3 align-middle text-xs text-muted-foreground break-words">{application.membershipNo || '—'}</td>
                  <td className="p-3 align-middle text-xs text-muted-foreground break-words">{application.loanType ? (loanTypeLabels[application.loanType] || application.loanType) : '—'}</td>
                  <td className="p-3 align-middle text-xs font-medium text-foreground break-words">{application.amount ? application.amount.toLocaleString() : '—'} ETB</td>
                  <td className="p-3 align-middle text-xs text-muted-foreground break-words">{branchName}</td>
                  <td className="p-3 align-middle"><StatusBadge status={application.status} /></td>
                  <td className="p-3 align-middle text-xs text-muted-foreground break-words">{new Date(submitted).toLocaleDateString()}</td>
                  <td className="p-3 align-middle">
                    <div className="flex items-center gap-1">
                      {missingDocs > 0 && <AlertTriangle className="h-3 w-3 text-warning" />}
                      <span className={`text-xs font-medium ${riskColors[risk]}`}>{t(`adminRisk${risk}`, risk)}</span>
                    </div>
                  </td>
                  <td className="p-2" onClick={(event) => event.stopPropagation()}>
                    <Button asChild variant="outline" size="sm" className="gap-1.5" title={t('adminViewDetails', 'View Details')}>
                      <Link to={`/admin/applications/loan/${application.id}`}>
                        <Info className="h-4 w-4" />
                        {t('details', 'Details')}
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-muted-foreground rounded-b-2xl">
          <p>{t('adminPageOf', 'Page {{page}} of {{total}}', { page, total: Math.max(1, totalPages) })}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>{t('adminPrevious', 'Previous')}</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>{t('next', 'Next')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
