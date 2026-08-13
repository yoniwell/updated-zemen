import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import { LOAN_QUEUE_STATUS_OPTIONS } from '@/lib/adminOptions';
import { useAdminLoanTypes } from '@/hooks/useAdminLoanTypes';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminI18n } from '@/lib/uiI18n';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Download, Search, AlertTriangle, Info } from 'lucide-react';
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
    fathersName?: string | null;
    grandfathersName?: string | null;
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
  const middle = applicant.fathersName || null;
  const last = applicant.grandfathersName || null;
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
  const { branches } = useAdminBranches();
  const { loanTypeNames } = useAdminLoanTypes();
  const currentUser = useMemo(() => getAdminUser(), []);
  const isBranchManager = currentUser?.role === 'BRANCH_MANAGER';
  const managerBranchId = currentUser?.branch?.id || '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState<string>(isBranchManager ? managerBranchId : 'all');
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

  useEffect(() => {
    if (isBranchManager && managerBranchId) {
      setBranchFilter(managerBranchId);
    }
  }, [isBranchManager, managerBranchId]);

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
      
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      } else {
        // Default queue statuses
        params.set('status', 'SUBMITTED,UNDER_REVIEW');
      }

      if (productFilter !== 'all') params.set('loanType', productFilter);
      if (branchFilter !== 'all') params.set('branchId', branchFilter);

      const response = await adminFetch<LoanQueueResponse>(`/api/loans?${params.toString()}`);
      setApplications(response.applications || []);
      const pagination = response.pagination;
      const nextTotal = pagination?.total ?? response.total ?? (response.applications || []).length;
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
    const types = new Set<string>(loanTypeNames);
    applications.forEach((application) => {
      if (application.loanType) {
        types.add(application.loanType);
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [applications, loanTypeNames]);



  const filtered = useMemo(() => applications, [applications]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info(t('noEntriesToExport', 'No entries to export'));
      return;
    }

    const header = ['Reference', 'Applicant', 'Membership No', 'Loan Type', 'Amount', 'Branch', 'Status', 'Submitted Date', 'Risk'];
    const rows = filtered.map((application) => {
      const applicantName = formatApplicantName(application.applicant);
      const missingDocs = (application.documents || []).filter((doc) => doc.status !== 'VERIFIED').length;
      const risk = missingDocs > 1 ? 'High' : missingDocs === 1 ? 'Medium' : 'Low';
      const submitted = application.submittedAt || application.updatedAt;
      return [
        application.referenceNo,
        applicantName,
        application.membershipNo || '-',
        application.loanType || '-',
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
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* 2.1 Page Header & Primary Actions */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('adminLoanApplicationsTitle', 'Loan Applications')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} {t('adminApplicationsLabel', 'applications')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            {t('export', 'Export')} CSV
          </button>
        </div>
      </div>

      {/* 2.2 Filter & Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('adminLoanQueueSearchPlaceholder', 'Search by name, member no, or reference...')} 
            value={search} 
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" 
          />
        </div>

        <select 
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow" 
          value={statusFilter} 
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">{t('adminAllStatuses', 'All Statuses')}</option>
          {LOAN_QUEUE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{labelizeStatus(status)}</option>
          ))}
        </select>

        <select 
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow" 
          value={productFilter} 
          onChange={(event) => setProductFilter(event.target.value)}
        >
          <option value="all">{t('adminAllTypes', 'All Types')}</option>
          {loanTypeOptions.map((loanType) => (
            <option key={loanType} value={loanType}>{loanType}</option>
          ))}
        </select>

        {!isBranchManager && (
          <select 
            className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow" 
            value={branchFilter} 
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            <option value="all">{t('adminAllBranches', 'All Branches')}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? <p className="rounded-md p-4 text-sm text-slate-600">{t('adminLoadingLoanQueue', 'Loading loan queue...')}</p> : null}

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow-sm mb-4">
          <p>{error}</p>
          <button className="px-4 py-2 bg-white rounded-lg text-sm font-bold shadow-sm" onClick={() => setReloadSeq((prev) => prev + 1)}>{t('refresh', 'Refresh')}</button>
        </div>
      ) : null}

      {/* 2.3 Data Table */}
      {!loading && !error ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('reference', 'Reference')}</th>
                  <th className="px-4 py-3 font-semibold">{t('applicant', 'Applicant')}</th>
                  <th className="px-4 py-3 font-semibold">{t('membershipNo', 'Membership No')}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminLoanTypeLabel', 'Loan Type')}</th>
                  <th className="px-4 py-3 font-semibold">{t('amount', 'Amount')}</th>
                  <th className="px-4 py-3 font-semibold">{t('branch', 'Branch')}</th>
                  <th className="px-4 py-3 font-semibold">{t('status', 'Status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('date', 'Date')}</th>
                  <th className="px-4 py-3 font-semibold">{t('adminRiskLabel', 'Risk')}</th>
                  <th className="px-4 py-3 font-semibold text-center">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((application) => {
                  const applicantName = formatApplicantName(application.applicant);
                  const documents = application.documents || [];
                  const missingDocs = documents.filter((doc) => doc.status !== 'VERIFIED').length;
                  const risk = missingDocs > 1 ? 'High' : missingDocs === 1 ? 'Medium' : 'Low';
                  const branchName = application.branch?.name || '—';
                  const submitted = application.submittedAt || application.updatedAt;

                  return (
                    <tr key={application.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => navigate(`/admin/applications/loan/${application.id}`)}>
                      <td className="px-4 py-3 font-bold text-slate-900">{application.referenceNo}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate">{applicantName}</td>
                      <td className="px-4 py-3 text-slate-500">{application.membershipNo || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{application.loanType || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{application.amount ? application.amount.toLocaleString() : '—'} ETB</td>
                      <td className="px-4 py-3 text-slate-500">{branchName}</td>
                      <td className="px-4 py-3"><StatusBadge status={application.status} /></td>
                      <td className="px-4 py-3 text-slate-500">{new Date(submitted).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {missingDocs > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          <span className={`text-xs font-bold ${risk === 'High' ? 'text-red-600' : risk === 'Medium' ? 'text-amber-500' : 'text-green-600'}`}>
                            {t(`adminRisk${risk}`, risk)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-center gap-6">
                          <button 
                            className="text-blue-600 hover:text-blue-800 transition-colors text-xs font-bold" 
                            title={t('adminViewDetails', 'View Details')} 
                            onClick={() => navigate(`/admin/applications/loan/${application.id}`)}
                          >
                            {t('details', 'Details')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">No applications found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* 2.4 Pagination Footer */}
          <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
            <span className="text-sm text-slate-500 font-medium">
              {t('adminPageOf', 'Page {{page}} of {{total}}', { page, total: Math.max(1, totalPages) })}
            </span>
            <div className="flex gap-2 items-center">
              <button 
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm"
                disabled={page <= 1} 
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t('adminPrevious', 'Previous')}
              </button>
              <span className="text-sm font-bold text-slate-500 px-2">{page} / {Math.max(1, totalPages)}</span>
              <button 
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm"
                disabled={page >= totalPages} 
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                {t('next', 'Next')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
