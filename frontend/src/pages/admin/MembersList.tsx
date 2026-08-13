import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminI18n } from '@/lib/uiI18n';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { Input } from '@/components/ui/input';




type MembershipApplication = {
  id: string;
  referenceNo: string;
  status: string;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  updatedAt: string;
  applicantType: string;
  occupation?: string | null;
  applicant: {
    firstName: string;
    fathersName?: string | null;
    grandfathersName?: string | null;
    phone: string;
    email?: string | null;
  };
  branch?: {
    name: string;
  } | null;
};

type MembershipListResponse = {
  applications: MembershipApplication[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};




type MembershipDetailResponse = {
  application: {
    id: string;
    referenceNo: string;
    status: string;
    membershipPaymentAmount?: number | null;
    membershipTransactionRef?: string | null;
    savingType?: string | null;
    savingPaymentAmount?: number | null;
    savingTransactionRef?: string | null;
    termsAccepted?: boolean | null;
    branch?: {
      name: string;
    } | null;
    applicant: {
      firstName: string;
      fathersName?: string | null;
      grandfathersName?: string | null;
      phone: string;
      email?: string | null;
      idType?: string | null;
      idNumber?: string | null;
    };
  };
};

type EditableMemberForm = {
  firstName: string;
  fathersName: string;
  grandfathersName: string;
  phone: string;
  email: string;
  idType: string;
  idNumber: string;
  membershipPaymentAmount: string;
  savingType: string;
  savingPaymentAmount: string;
  savingTransactionRef: string;
  termsAccepted: boolean;
  preferredBranch: string;
};

type PortalDocumentField = 'idFrontName' | 'idBackName' | 'applicantPhotoName' | 'filledFormName' | 'membershipPaymentProofName' | 'savingProofName';



const uploadMemberDocument = async (applicationId: string, file: File, category: string): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  await adminFetch(`/api/membership/${applicationId}/documents`, {
    method: 'POST',
    body: formData,
  });
};

export default function MembersList() {
  const { tAdmin } = useAdminI18n();
  const navigate = useNavigate();
  const { branches } = useAdminBranches();
  const currentUser = useMemo(() => getAdminUser(), []);
  const isBranchManager = currentUser?.role === 'BRANCH_MANAGER';
  const managerBranchId = currentUser?.branch?.id || '';
  const canDeleteMembers = currentUser?.role === 'SUPER_ADMIN';

  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy] = useState<'createdAt' | 'updatedAt' | 'submittedAt' | 'status' | 'referenceNo'>('updatedAt');
  const sortOrder: 'asc' | 'desc' = 'desc';
  const [reloadSeq, setReloadSeq] = useState(0);
  const [search, setSearch] = useState('');

  const [typeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState<string>(isBranchManager ? managerBranchId : 'all');

  useEffect(() => {
    if (isBranchManager && managerBranchId) {
      setBranchFilter(managerBranchId);
    }
  }, [isBranchManager, managerBranchId]);

  const loadApprovedMembers = useCallback(async () => {
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
      if (typeFilter !== 'all') params.set('applicantType', typeFilter);
      if (branchFilter !== 'all') params.set('branchId', branchFilter);

      const response = await adminFetch<MembershipListResponse>(`/api/membership?${params.toString()}`);
      setApplications(response.applications);
      setTotal(response.pagination?.total ?? response.applications.length);
      setTotalPages(response.pagination?.totalPages ?? 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tAdmin('failedLoadMembers', 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, search, typeFilter, branchFilter, tAdmin]);

  useEffect(() => {
    void loadApprovedMembers();
  }, [loadApprovedMembers, reloadSeq]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleBranchChange = (value: string) => {
    setBranchFilter(value);
    setPage(1);
  };

  const visibleMembers = useMemo(() => {
    return applications;
  }, [applications]);

  const handleDeleteMember = async (member: MembershipApplication) => {
    try {
      await adminFetch(`/api/membership/${member.id}`, {
        method: 'DELETE',
      });
      toast.success(tAdmin('memberDeletedSuccessfully', '{{referenceNo}} deleted successfully.', { referenceNo: member.referenceNo }));
      setReloadSeq((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : tAdmin('failedDeleteMember', 'Failed to delete member'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* 2.1 Page Header & Primary Actions */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tAdmin('membersListHeading', 'Members List')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{tAdmin('membersListSubheading', 'Approved and activated members')}</p>
        </div>
      </div>

      {/* 2.2 Filter & Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={tAdmin('searchMembers', 'Search approved members...')} 
            value={search} 
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" 
          />
        </div>
        

        {!isBranchManager && (
          <select className="h-10 w-[180px] rounded-md border border-input bg-background px-3 text-sm" value={branchFilter} onChange={(event) => handleBranchChange(event.target.value)}>
            <option value="all">{tAdmin('allBranches', 'All Branches')}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? <p className="rounded-md p-4 text-sm text-muted-foreground">{tAdmin('loadingMembers', 'Loading members...')}</p> : null}
      
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow-sm mb-4">
          <p>{error}</p>
          <button className="px-4 py-2 bg-white rounded-lg text-sm font-bold shadow-sm" onClick={() => setReloadSeq((value) => value + 1)}>{tAdmin('retry', 'Retry')}</button>
        </div>
      ) : null}

      {/* 2.3 Data Table */}
      {!loading && !error ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">{tAdmin('reference', 'Reference')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('fullName', 'Full Name')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('phone', 'Phone')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('applicantType', 'Applicant Type')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('branch', 'Branch')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('status', 'Status')}</th>
                  <th className="px-4 py-3 font-semibold">{tAdmin('date', 'Date')}</th>
                  <th className="px-4 py-3 font-semibold text-center">{tAdmin('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => {
                  const fullName = [member.applicant.firstName, member.applicant.fathersName, member.applicant.grandfathersName].filter((part) => Boolean(part && part.trim())).join(' ');
                  return (
                    <tr key={member.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => { navigate(`/admin/applications/membership/${member.id}`); }}>
                      <td className="px-4 py-3 font-bold text-slate-900">{member.referenceNo}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate">{fullName}</td>
                      <td className="px-4 py-3 text-slate-500">{member.applicant.phone}</td>
                      <td className="px-4 py-3 text-slate-500">{member.applicantType}</td>
                      <td className="px-4 py-3 text-slate-500">{member.branch?.name || tAdmin('emDash', '—')}</td>
                      <td className="px-4 py-3"><StatusBadge status={member.status} /></td>
                      <td className="px-4 py-3 text-slate-500">{new Date(member.reviewedAt || member.updatedAt || member.submittedAt || Date.now()).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-center gap-6">
                          <button 
                            className="text-slate-400 hover:text-blue-600 transition-colors" 
                            title={tAdmin('viewMemberDetails', 'View Member Details')} 
                            onClick={() => { navigate(`/admin/applications/membership/${member.id}`); }}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {canDeleteMembers ? (
                            <button 
                              className="text-slate-400 hover:text-red-600 transition-colors" 
                              title={tAdmin('deleteMember', 'Delete Member')} 
                              onClick={() => {
                                toast.custom((t) => (
                                  <div className="flex flex-col gap-4 min-w-[250px] bg-white p-4 rounded-xl shadow-xl border">
                                    <div className="flex flex-col gap-1">
                                      <p className="font-extrabold text-slate-900 text-base">Delete Record?</p>
                                      <p className="text-sm text-slate-500 font-medium">This action cannot be undone for {member.referenceNo}.</p>
                                    </div>
                                    <div className="flex gap-2 justify-end mt-1">
                                      <button className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors" onClick={() => toast.dismiss(t)}>Cancel</button>
                                      <button className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-red-600 transition-colors" onClick={async () => {
                                        toast.dismiss(t);
                                        await handleDeleteMember(member);
                                      }}>Delete</button>
                                    </div>
                                  </div>
                                ), { duration: Infinity });
                              }}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleMembers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">{tAdmin('noMembersFound', 'No approved members found.')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* 2.4 Pagination Footer */}
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
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function FileField({ label, value, error, onPick }: { label: string; value?: string; error?: string; onPick: (file: File | null) => void }) {
  const { tAdmin } = useAdminI18n();
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      <Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => onPick(event.target.files?.[0] ?? null)} />
      {value ? <p className="text-xs text-emerald-700">{tAdmin('selectedFile', 'Selected: {{value}}', { value })}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
