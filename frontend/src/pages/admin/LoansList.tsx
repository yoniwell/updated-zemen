import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import { useAdminLoanTypes } from '@/hooks/useAdminLoanTypes';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';
import { useAdminI18n } from '@/lib/uiI18n';
import { useAdminBranches } from '@/hooks/useAdminBranches';

type LoanApplication = {
  id: string;
  referenceNo: string;
  status: string;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  updatedAt: string;
  membershipNo?: string | null;
  loanType?: string | null;
  amount?: number | null;
  tenure?: number | null;
  applicant: {
    firstName: string;
    fathersName?: string | null;
    grandfathersName?: string | null;
    phone: string;
  };
  branch?: {
    id: string;
    name: string;
  } | null;
};

type LoanListResponse = {
  applications: LoanApplication[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export default function LoansList() {
  const { tAdmin } = useAdminI18n();
  const navigate = useNavigate();
  const { branches } = useAdminBranches();
  const { loanTypeNames } = useAdminLoanTypes();
  const currentUser = useMemo(() => getAdminUser(), []);
  const isBranchManager = currentUser?.role === 'BRANCH_MANAGER';
  const managerBranchId = currentUser?.branch?.id || '';
  const canDeleteLoans = currentUser?.role === 'SUPER_ADMIN';

  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy] = useState<'createdAt' | 'updatedAt' | 'submittedAt' | 'status' | 'referenceNo' | 'amount' | 'loanType'>('updatedAt');
  const sortOrder: 'asc' | 'desc' = 'desc';
  const [reloadSeq, setReloadSeq] = useState(0);
  const [search, setSearch] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState<string>(isBranchManager ? managerBranchId : 'all');
  const [deleteTarget, setDeleteTarget] = useState<LoanApplication | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (isBranchManager && managerBranchId) {
      setBranchFilter(managerBranchId);
    }
  }, [isBranchManager, managerBranchId]);

  const loadApprovedLoans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      params.set('status', 'APPROVED');
      if (search.trim()) params.set('search', search.trim());
      if (loanTypeFilter !== 'all') params.set('loanType', loanTypeFilter);
      if (branchFilter !== 'all') params.set('branchId', branchFilter);

      const response = await adminFetch<LoanListResponse>(`/api/loans?${params.toString()}`);
      setApplications(response.applications);
      setTotal(response.pagination?.total ?? response.applications.length);
      setTotalPages(response.pagination?.totalPages ?? 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tAdmin('failedLoadApprovedLoans', 'Failed to load approved loans'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, search, loanTypeFilter, branchFilter, tAdmin]);

  useEffect(() => {
    void loadApprovedLoans();
  }, [loadApprovedLoans, reloadSeq]);

  useEffect(() => {
    const handleApplicationUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ applicationType?: string }>;
      if (customEvent.detail?.applicationType && customEvent.detail.applicationType !== 'loan') {
        return;
      }
      void loadApprovedLoans();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'admin:application-updated' || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue) as { applicationType?: string };
        if (!payload.applicationType || payload.applicationType === 'loan') {
          void loadApprovedLoans();
        }
      } catch {
        // Ignore invalid payloads.
      }
    };

    const handleFocus = () => { void loadApprovedLoans(); };

    window.addEventListener('admin:application-updated', handleApplicationUpdated as EventListener);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('admin:application-updated', handleApplicationUpdated as EventListener);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadApprovedLoans]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleLoanTypeChange = (value: string) => {
    setLoanTypeFilter(value);
    setPage(1);
  };

  const handleBranchChange = (value: string) => {
    setBranchFilter(value);
    setPage(1);
  };

  const confirmDeleteLoan = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await adminFetch(`/api/loans/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(tAdmin('loanDeletedSuccessfully', '{{referenceNo}} deleted successfully.', { referenceNo: deleteTarget.referenceNo }));
      setDeleteTarget(null);
      setReloadSeq((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : tAdmin('failedDeleteLoan', 'Failed to delete loan'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const approvedLoans = useMemo(() => applications, [applications]);

  const loanTypeOptions = useMemo(() => {
    return [...loanTypeNames].sort((a, b) => a.localeCompare(b));
  }, [loanTypeNames]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tAdmin('approvedLoansListHeading', 'Approved Loans List')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{tAdmin('approvedLoansListSubheading', 'All approved loan applications')}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={tAdmin('searchApprovedLoans', 'Search approved loans...')}
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm"
          />
        </div>

        <select
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow"
          value={loanTypeFilter}
          onChange={(event) => handleLoanTypeChange(event.target.value)}
        >
          <option value="all">{tAdmin('allLoanTypes', 'All Loan Types')}</option>
          {loanTypeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {!isBranchManager && (
          <select
            className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow"
            value={branchFilter}
            onChange={(event) => handleBranchChange(event.target.value)}
          >
            <option value="all">{tAdmin('allBranches', 'All Branches')}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? <p className="rounded-md p-4 text-sm text-muted-foreground">{tAdmin('loadingApprovedLoans', 'Loading approved loans...')}</p> : null}

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow-sm mb-4">
          <p>{error}</p>
          <button className="px-4 py-2 bg-white rounded-lg text-sm font-bold shadow-sm" onClick={() => setReloadSeq((value) => value + 1)}>{tAdmin('retry', 'Retry')}</button>
        </div>
      ) : null}

      {/* Data Table */}
      {!loading && !error ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">{tAdmin('reference', 'Reference')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('applicant', 'Applicant')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('phone', 'Phone')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('membershipNo', 'Membership No')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('loanType', 'Loan Type')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('branch', 'Branch')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('amount', 'Amount')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('status', 'Status')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('approvedDate', 'Approved Date')}</th>
                  <th className="px-4 py-3 font-semibold text-center">{tAdmin('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {approvedLoans.map((loan) => {
                  const fullName = [loan.applicant.firstName, loan.applicant.fathersName, loan.applicant.grandfathersName]
                    .filter((part) => Boolean(part && part.trim()))
                    .join(' ');
                  return (
                    <tr
                      key={loan.id}
                      className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => { navigate(`/admin/applications/loan/${loan.id}`); }}
                    >
                      <td className="px-4 py-3 font-bold text-slate-900">{loan.referenceNo}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate">{fullName}</td>
                      <td className="px-4 py-3 text-slate-500">{loan.applicant.phone}</td>
                      <td className="px-4 py-3 text-slate-500">{loan.membershipNo || tAdmin('emDash', '—')}</td>
                      <td className="px-4 py-3 text-slate-500">{loan.loanType || tAdmin('emDash', '—')}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{loan.branch?.name || tAdmin('emDash', '—')}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{loan.amount ? `${loan.amount.toLocaleString()} ETB` : tAdmin('emDash', '—')}</td>
                      <td className="px-4 py-3"><StatusBadge status={loan.status} /></td>
                      <td className="px-4 py-3 text-slate-500">{new Date(loan.reviewedAt || loan.updatedAt || loan.submittedAt || Date.now()).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-center gap-6">
                          <button
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title={tAdmin('viewLoanDetails', 'View Loan Details')}
                            onClick={() => { navigate(`/admin/applications/loan/${loan.id}`); }}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {canDeleteLoans ? (
                            <button
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title={tAdmin('deleteLoan', 'Delete Loan')}
                              onClick={() => setDeleteTarget(loan)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {approvedLoans.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">{tAdmin('noApprovedLoansFound', 'No approved loans found.')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
            <span className="text-sm text-slate-500 font-medium">
              {tAdmin('showingRangeOfTotal', 'Showing {{start}}-{{end}} of {{total}}', {
                start: applications.length === 0 ? 0 : (page - 1) * limit + 1,
                end: Math.min(page * limit, total),
                total,
              })}
            </span>
            <div className="flex gap-2 items-center">
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {tAdmin('previous', 'Previous')}
              </button>
              <span className="text-sm font-bold text-slate-500 px-2">{page} / {Math.max(1, totalPages)}</span>
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                {tAdmin('next', 'Next')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        loading={deleteSubmitting}
        title={`Delete ${deleteTarget?.referenceNo || 'Loan'}?`}
        description="Are you sure you want to delete this loan application? This action cannot be undone."
        onConfirm={() => void confirmDeleteLoan()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
