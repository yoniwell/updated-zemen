import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { MEMBERSHIP_QUEUE_STATUS_OPTIONS } from '@/lib/adminOptions';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';
import { useAdminI18n } from '@/lib/uiI18n';
import { AlertTriangle, BadgeCheck } from 'lucide-react';
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
    fathersName?: string | null;
    grandfathersName?: string | null;
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
  const middle = applicant.fathersName || null;
  const last = applicant.grandfathersName || null;
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
  const { branches } = useAdminBranches();
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
        
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        } else {
          // Default queue statuses
          params.set('status', 'SUBMITTED,UNDER_REVIEW');
        }

        if (branchFilter !== 'all') params.set('branchId', branchFilter);
        if (officerFilter !== 'all' && officerFilter !== '—') params.set('assignedToId', officerFilter);

        const response = await adminFetch<MembershipQueueResponse>(`/api/membership?${params.toString()}`);
        setApplications(response.applications || []);
        const pagination = response.pagination;
        const nextTotal = pagination?.total ?? response.total ?? (response.applications || []).length;
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
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* 2.1 Page Header & Primary Actions */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tAdmin('membershipApplications', 'Membership Applications')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{tAdmin('applicationsCount', '{{count}} applications', { count: total })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="bg-white text-slate-700 border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm">
            <Download className="w-4 h-4" /> {tAdmin('exportCsv', 'Export CSV')}
          </button>
        </div>
      </div>

      {/* 2.2 Filter & Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm"
            placeholder={tAdmin('searchByNamePhoneOrReference', 'Search by name, phone, or reference...')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select 
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow" 
          value={statusFilter} 
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">{tAdmin('allStatuses', 'All Statuses')}</option>
          {MEMBERSHIP_QUEUE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{labelizeStatus(status)}</option>
          ))}
        </select>

        <select 
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow" 
          value={branchFilter} 
          onChange={(event) => setBranchFilter(event.target.value)}
        >
          <option value="all">{tAdmin('allBranches', 'All Branches')}</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </div>

      {/* 2.3 Data Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap text-sm">
            <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">{tAdmin('reference', 'Reference')}</th>
                <th className="px-4 py-3 font-semibold">{tAdmin('applicant', 'Applicant')}</th>
                <th className="px-4 py-3 font-semibold">{tAdmin('branch', 'Branch')}</th>
                <th className="px-4 py-3 font-semibold">{tAdmin('status', 'Status')}</th>
                <th className="px-4 py-3 font-semibold">{tAdmin('date', 'Date')}</th>
                <th className="px-4 py-3 font-semibold text-center">{tAdmin('unverifiedDocs', 'Unverified Docs')}</th>
                <th className="px-4 py-3 font-semibold">{tAdmin('updated', 'Updated')}</th>
                <th className="px-4 py-3 font-semibold text-center">{tAdmin('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((application) => {
                const applicantName = formatApplicantName(application.applicant);
                const branchName = application.branch?.name || '—';
                const documents = application.documents || [];
                const unverifiedDocs = documents.filter((doc) => doc.status !== 'VERIFIED').length;
                const displayDate = application.submittedAt || application.updatedAt;
                
                return (
                <tr key={application.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => navigate(`/admin/applications/membership/${application.id}`)}>
                  <td className="px-4 py-3 font-bold text-slate-900">{application.referenceNo}</td>
                  <td className="px-4 py-3 max-w-[150px] truncate">
                    <div className="font-medium">{applicantName}</div>
                    <div className="text-xs text-slate-500">{application.applicant.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{branchName}</td>
                  <td className="px-4 py-3"><StatusBadge status={application.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(displayDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    {unverifiedDocs > 0 ? (
                      <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs font-bold border border-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        {unverifiedDocs}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200">
                        <BadgeCheck className="h-3 w-3" />
                        0
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(application.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                    <Link to={`/admin/applications/membership/${application.id}`} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 text-slate-700 font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm text-xs">
                      <Info className="h-3.5 w-3.5" />
                      {tAdmin('details', 'Details')}
                    </Link>
                  </td>
                </tr>
              );})}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">No applications found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* 2.4 Pagination Footer */}
        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
          <span className="text-sm text-slate-500 font-medium">
            {tAdmin('pageOf', 'Page {{page}} / {{totalPages}}', { page, totalPages: Math.max(1, totalPages) })}
          </span>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm"
              disabled={page <= 1} 
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              {tAdmin('previous', 'Previous')}
            </button>
            <button 
              className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm"
              disabled={page >= totalPages} 
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              {tAdmin('next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
