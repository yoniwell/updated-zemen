import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, UserCheck, HandCoins, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MEMBERSHIP_QUEUE_STATUS_OPTIONS, LOAN_QUEUE_STATUS_OPTIONS } from '@/lib/adminOptions';
import { adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Branch = { id: string; name: string };

type QueueApplication = { id: string };
type QueueResponse = { applications: QueueApplication[]; total?: number };

export default function AdminDashboard() {
  const user = getAdminUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [counts, setCounts] = useState({
    membershipQueue: 0,
    loanQueue: 0,
    activeMembers: 0,
    approvedLoans: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch branches once if SUPER_ADMIN
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      adminFetch<{ branches: Branch[] }>('/api/settings/branches')
        .then(res => setBranches(res.branches))
        .catch(console.error);
    }
  }, [user?.role]);

  const loadReports = useCallback(async () => {
    setLoading(true);

    const membershipStatuses = MEMBERSHIP_QUEUE_STATUS_OPTIONS.join(',');
    const loanStatuses = LOAN_QUEUE_STATUS_OPTIONS.join(',');

    let branchQuery = '';
    if (user?.role === 'SUPER_ADMIN' && selectedBranch !== 'ALL') {
      branchQuery = `&branchId=${selectedBranch}`;
    }

    const [membershipQueueResult, loanQueueResult, approvedMembershipResult, approvedLoanResult] = await Promise.allSettled([
      adminFetch<QueueResponse>(`/api/membership?page=1&limit=1000&status=${membershipStatuses}${branchQuery}`),
      adminFetch<QueueResponse>(`/api/loans?page=1&limit=1000&status=${loanStatuses}${branchQuery}`),
      adminFetch<QueueResponse>(`/api/membership?page=1&limit=1000&status=APPROVED${branchQuery}`),
      adminFetch<QueueResponse>(`/api/loans?page=1&limit=1000&status=APPROVED${branchQuery}`),
    ]);

    const getCount = (result: PromiseSettledResult<QueueResponse>) => {
      if (result.status !== 'fulfilled' || !result.value) return 0;
      return typeof result.value.total === 'number' ? result.value.total : (result.value.applications?.length ?? 0);
    };

    setCounts({
      membershipQueue: getCount(membershipQueueResult),
      loanQueue: getCount(loanQueueResult),
      activeMembers: getCount(approvedMembershipResult),
      approvedLoans: getCount(approvedLoanResult),
    });
    setLoading(false);
  }, [selectedBranch, user?.role]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Real-time status of applications and active accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'SUPER_ADMIN' && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px] h-11 bg-white border-slate-200 font-medium">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button 
            variant="outline" 
            className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all rounded-xl h-11 px-5 font-bold" 
            onClick={() => void loadReports()} 
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync Data'}
          </Button>
        </div>
      </section>

      {/* Cards Grid */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Membership Queue Card */}
        <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-500 to-fuchsia-600 p-1 shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/40">
          <div className="flex h-full flex-col justify-between rounded-[1.75rem] bg-white/10 backdrop-blur-md p-6">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-white/20 p-3 shadow-inner">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-8">
              <p className="text-sm font-black uppercase tracking-widest text-white/80">Membership Queue</p>
              <h2 className="mt-1 text-5xl font-black text-white">{loading ? '-' : counts.membershipQueue}</h2>
              <p className="mt-2 text-sm font-medium text-violet-100">Applications awaiting review</p>
            </div>
            <Link to="/admin/membership-queue" className="mt-6 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
              View Queue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Loan Queue Card */}
        <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 p-1 shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/40">
          <div className="flex h-full flex-col justify-between rounded-[1.75rem] bg-white/10 backdrop-blur-md p-6">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-white/20 p-3 shadow-inner">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-8">
              <p className="text-sm font-black uppercase tracking-widest text-white/80">Loan Queue</p>
              <h2 className="mt-1 text-5xl font-black text-white">{loading ? '-' : counts.loanQueue}</h2>
              <p className="mt-2 text-sm font-medium text-amber-100">Applications awaiting review</p>
            </div>
            <Link to="/admin/loan-queue" className="mt-6 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
              View Queue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Active Members Card */}
        <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-400 to-teal-500 p-1 shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/40">
          <div className="flex h-full flex-col justify-between rounded-[1.75rem] bg-white/10 backdrop-blur-md p-6">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-white/20 p-3 shadow-inner">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-8">
              <p className="text-sm font-black uppercase tracking-widest text-white/80">Active Members</p>
              <h2 className="mt-1 text-5xl font-black text-white">{loading ? '-' : counts.activeMembers}</h2>
              <p className="mt-2 text-sm font-medium text-emerald-100">Approved member accounts</p>
            </div>
            <Link to="/admin/members-list" className="mt-6 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
              View Members
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Approved Loans Card */}
        <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/40">
          <div className="flex h-full flex-col justify-between rounded-[1.75rem] bg-white/10 backdrop-blur-md p-6">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-white/20 p-3 shadow-inner">
                <HandCoins className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-8">
              <p className="text-sm font-black uppercase tracking-widest text-white/80">Approved Loans</p>
              <h2 className="mt-1 text-5xl font-black text-white">{loading ? '-' : counts.approvedLoans}</h2>
              <p className="mt-2 text-sm font-medium text-blue-100">Currently active loan facilities</p>
            </div>
            <Link to="/admin/loans-list" className="mt-6 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
              View Loans
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

      </section>
    </div>
  );
}
