import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminI18n } from '@/lib/uiI18n';
import { useAdminBranches } from '@/hooks/useAdminBranches';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';



const MEMBER_LIST_STATUS_OPTIONS = ['APPROVED', 'ACTIVATED'] as const;
type MemberListStatusOption = (typeof MEMBER_LIST_STATUS_OPTIONS)[number];

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
    middleName?: string | null;
    lastName?: string | null;
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
    savingType?: string | null;
    savingPaymentAmount?: number | null;
    savingTransactionRef?: string | null;
    termsAccepted?: boolean | null;
    branch?: {
      name: string;
    } | null;
    applicant: {
      firstName: string;
      middleName?: string | null;
      lastName?: string | null;
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

const SAVING_TYPE_OPTIONS = [
  'REGULAR_SAVING',
  'CHILDRENS_SAVING',
  'TIME_DEPOSIT_SAVING',
  'NON_INTEREST_SAVING',
  'DIASPORA_SAVING',
  'VEHICLE_HOUSE_SAVING',
  'CHOICE_SAVING',
] as const;

const uploadMemberDocument = async (applicationId: string, file: File, category: string): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await fetch(`/api/applications/${applicationId}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Failed to upload ${file.name}`);
  }
};

export default function MembersList() {
  const { tAdmin } = useAdminI18n();
  const { branchNames } = useAdminBranches();
  const currentUser = useMemo(() => getAdminUser(), []);
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
  const [density] = useState<'compact' | 'comfortable'>('comfortable');
  const [reloadSeq, setReloadSeq] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberListStatusOption>('all');
  const [typeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [openEdit, setOpenEdit] = useState(false);
  const [editingMember, setEditingMember] = useState<MembershipApplication | null>(null);
  const [editForm, setEditForm] = useState<EditableMemberForm | null>(null);
  const [editUploadedFiles, setEditUploadedFiles] = useState<Partial<Record<PortalDocumentField, File>>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'deactivate' | 'delete'; member: MembershipApplication } | null>(null);

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
      if (statusFilter === 'all') {
        params.set('status', MEMBER_LIST_STATUS_OPTIONS.join(','));
      } else {
        params.set('status', statusFilter);
      }
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter !== 'all') params.set('applicantType', typeFilter);
      if (branchFilter !== 'all') params.set('branchName', branchFilter);

      const response = await adminFetch<MembershipListResponse>(`/api/membership?${params.toString()}`);
      setApplications(response.applications);
      setTotal(response.pagination?.total ?? response.applications.length);
      setTotalPages(response.pagination?.totalPages ?? 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tAdmin('failedLoadMembers', 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, search, statusFilter, typeFilter, branchFilter, tAdmin]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, branchFilter, limit, sortBy, sortOrder]);

  useEffect(() => {
    void loadApprovedMembers();
  }, [loadApprovedMembers, reloadSeq]);

  const visibleMembers = useMemo(() => {
    return applications;
  }, [applications]);

  const branchOptions = useMemo(() => {
    const names = new Set<string>(branchNames);
    applications.forEach((application) => {
      if (application.branch?.name) {
        names.add(application.branch.name);
      }
    });
    names.add('UNASSIGNED');
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [applications, branchNames]);

  const selectableBranches = useMemo(() => branchOptions.filter((branch) => branch !== 'UNASSIGNED'), [branchOptions]);

  const memberStatusOptions = useMemo(() => MEMBER_LIST_STATUS_OPTIONS, []);

  const handleOpenEdit = async (member: MembershipApplication) => {
    setEditingMember(member);
    setOpenEdit(true);
    setEditLoading(true);

    try {
      const response = await adminFetch<MembershipDetailResponse>(`/api/membership/${member.id}`);
      const detail = response.application;

      setEditForm({
        firstName: detail.applicant.firstName || '',
        fathersName: detail.applicant.middleName || '',
        grandfathersName: detail.applicant.lastName || '',
        phone: detail.applicant.phone || '',
        email: detail.applicant.email || '',
        idType: detail.applicant.idType || 'NATIONAL_ID',
        idNumber: detail.applicant.idNumber || '',
        membershipPaymentAmount: detail.membershipPaymentAmount?.toString() || '',
        savingType: detail.savingType || '',
        savingPaymentAmount: detail.savingPaymentAmount?.toString() || '',
        savingTransactionRef: detail.savingTransactionRef || '',
        termsAccepted: Boolean(detail.termsAccepted),
        preferredBranch: detail.branch?.name || '',
      });
      setEditUploadedFiles({});
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : tAdmin('failedLoadMemberDetails', 'Failed to load member details'));
      setOpenEdit(false);
      setEditingMember(null);
      setEditForm(null);
      setEditUploadedFiles({});
    } finally {
      setEditLoading(false);
    }
  };

  const updateEditField = <K extends keyof EditableMemberForm>(field: K, value: EditableMemberForm[K]) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const closeEditDialog = () => {
    if (editSaving) return;
    setOpenEdit(false);
    setEditingMember(null);
    setEditForm(null);
    setEditUploadedFiles({});
    setEditLoading(false);
  };

  const setEditUploadedFile = (field: PortalDocumentField, file: File | null) => {
    setEditUploadedFiles((prev) => {
      const next = { ...prev };
      if (file) {
        next[field] = file;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const saveEditedMember = async () => {
    if (!editingMember || !editForm) {
      return;
    }

    setEditSaving(true);
    try {
      await adminFetch(`/api/membership/${editingMember.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: editForm.firstName,
          fathersName: editForm.fathersName || undefined,
          grandfathersName: editForm.grandfathersName || undefined,
          phone: editForm.phone,
          email: editForm.email || undefined,
          idType: editForm.idType || undefined,
          idNumber: editForm.idNumber || undefined,
          membershipPaymentAmount: editForm.membershipPaymentAmount !== '' ? Number(editForm.membershipPaymentAmount) : undefined,
          savingType: editForm.savingType || undefined,
          savingPaymentAmount: editForm.savingPaymentAmount !== '' ? Number(editForm.savingPaymentAmount) : undefined,
          savingTransactionRef: editForm.savingTransactionRef || undefined,
          termsAccepted: editForm.termsAccepted,
          preferredBranch: editForm.preferredBranch || '',
        }),
      });

      const uploads: Array<{ field: PortalDocumentField; category: string }> = [
        { field: 'idFrontName', category: editForm.idType === 'PASSPORT' ? 'PASSPORT' : 'NATIONAL_ID_FRONT' },
        { field: 'applicantPhotoName', category: 'APPLICANT_PHOTO' },
        { field: 'filledFormName', category: 'FILLED_FORM' },
        { field: 'membershipPaymentProofName', category: 'MEMBERSHIP_PAYMENT_PROOF' },
        { field: 'savingProofName', category: 'SAVING_PAYMENT_PROOF' },
      ];

      const selectedIdBack = editUploadedFiles.idBackName;
      if (selectedIdBack && editForm.idType === 'NATIONAL_ID') {
        uploads.splice(1, 0, { field: 'idBackName', category: 'NATIONAL_ID_BACK' });
      }

      for (const upload of uploads) {
        const file = editUploadedFiles[upload.field];
        if (!file) continue;
        await uploadMemberDocument(editingMember.id, file, upload.category);
      }

      toast.success(tAdmin('memberUpdatedReference', 'Member updated: {{referenceNo}}', { referenceNo: editingMember.referenceNo }));
      closeEditDialog();
      setReloadSeq((value) => value + 1);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : tAdmin('failedUpdateMember', 'Failed to update member'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeactivateMember = async (member: MembershipApplication) => {
    if (member.status !== 'ACTIVATED') {
      toast.info(tAdmin('memberAlreadyNotActive', '{{referenceNo}} is already not active.', { referenceNo: member.referenceNo }));
      return;
    }

    try {
      await adminFetch(`/api/admin/applications/membership/${member.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'APPROVED',
          note: 'Deactivated from members list',
        }),
      });
      toast.success(tAdmin('memberDeactivatedSuccessfully', '{{referenceNo}} deactivated successfully.', { referenceNo: member.referenceNo }));
      setReloadSeq((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : tAdmin('failedDeactivateMember', 'Failed to deactivate member'));
    }
  };

  const handleDeleteMember = async (member: MembershipApplication) => {
    try {
      await adminFetch(`/api/admin/applications/membership/${member.id}`, {
        method: 'DELETE',
      });
      toast.success(tAdmin('memberDeletedSuccessfully', '{{referenceNo}} deleted successfully.', { referenceNo: member.referenceNo }));
      setReloadSeq((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : tAdmin('failedDeleteMember', 'Failed to delete member'));
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const selected = pendingAction;
    setPendingAction(null);

    if (selected.type === 'deactivate') {
      await handleDeactivateMember(selected.member);
      return;
    }

    await handleDeleteMember(selected.member);
  };

  return (
    <section className="space-y-4">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{tAdmin('membersListHeading', 'Members List')}</h1>
          <p className="text-sm text-muted-foreground">{tAdmin('membersListSubheading', 'Approved and activated members')}</p>
        </div>


        <Dialog open={openEdit} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
          <DialogContent className="max-h-[92vh] w-[92vw] overflow-y-auto sm:max-w-[92vw] xl:max-w-7xl">
            <DialogHeader>
              <DialogTitle>{tAdmin('editMember', 'Edit Member')} {editingMember ? `- ${editingMember.referenceNo}` : ''}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('reference', 'Reference')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{editingMember?.referenceNo || tAdmin('emDash', '—')}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('fullName', 'Full Name')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {editingMember ? [editingMember.applicant.firstName, editingMember.applicant.middleName, editingMember.applicant.lastName].filter((part) => Boolean(part && part.trim())).join(' ') : tAdmin('emDash', '—')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('status', 'Status')}</p>
                <div className="mt-1">{editingMember ? <StatusBadge status={editingMember.status} /> : tAdmin('emDash', '—')}</div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('branch', 'Branch')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{editingMember?.branch?.name || tAdmin('unassigned', 'Unassigned')}</p>
              </div>
            </div>

            {editLoading || !editForm ? (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-muted-foreground">{tAdmin('loadingMemberDetails', 'Loading member details...')}</p>
            ) : (
              <div className="space-y-4 pt-1">
                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-4">
                  <h3 className="md:col-span-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('startAndContact', 'Start & Contact')}</h3>
                  <Field label={tAdmin('phone', 'Phone')}><Input placeholder="e.g. +251911223344" value={editForm.phone} onChange={(event) => updateEditField('phone', event.target.value)} /></Field>
                  <Field label={tAdmin('email', 'Email')}><Input type="email" placeholder="e.g. selam@example.com" value={editForm.email} onChange={(event) => updateEditField('email', event.target.value)} /></Field>
                  <Field label={tAdmin('preferredBranch', 'Preferred Branch')}>
                    <select className="h-10 w-full rounded-md border px-3" value={editForm.preferredBranch} onChange={(event) => updateEditField('preferredBranch', event.target.value)}>
                      <option value="">{tAdmin('unassigned', 'Unassigned')}</option>
                      {selectableBranches.map((branch) => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </Field>
                </section>

                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-3">
                  <h3 className="md:col-span-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('personalInformation', 'Personal Information')}</h3>
                  <Field label={tAdmin('firstName', 'First Name')}><Input placeholder="e.g. Selam" value={editForm.firstName} onChange={(event) => updateEditField('firstName', event.target.value)} /></Field>
                  <Field label={tAdmin('fathersName', "Father's Name")}><Input placeholder="e.g. Tekle" value={editForm.fathersName} onChange={(event) => updateEditField('fathersName', event.target.value)} /></Field>
                  <Field label={tAdmin('grandfathersName', "Grandfather's Name")}><Input placeholder="e.g. Gebre" value={editForm.grandfathersName} onChange={(event) => updateEditField('grandfathersName', event.target.value)} /></Field>
                </section>

                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-3">
                  <h3 className="md:col-span-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('kycDocuments', 'KYC Documents')}</h3>
                  <Field label={tAdmin('idTypeLabel', 'ID Type')}>
                    <select className="h-10 w-full rounded-md border px-3" value={editForm.idType} onChange={(event) => updateEditField('idType', event.target.value)}>
                      <option value="NATIONAL_ID">{tAdmin('nationalIdLabel', 'National ID')}</option>
                      <option value="PASSPORT">{tAdmin('passport', 'Passport')}</option>
                      <option value="DRIVING_LICENSE">{tAdmin('drivingLicense', 'Driving License')}</option>
                      <option value="STUDENT_ID">{tAdmin('studentId', 'Student ID')}</option>
                      <option value="KEBELE_ID">{tAdmin('kebeleId', 'Kebele ID')}</option>
                    </select>
                  </Field>
                  <Field label={tAdmin('idNumber', 'ID Number')}><Input placeholder="e.g. ID-12345678" value={editForm.idNumber} onChange={(event) => updateEditField('idNumber', event.target.value)} /></Field>
                  <FileField label={tAdmin('idFrontName', 'ID Front File')} value={editUploadedFiles.idFrontName?.name} onPick={(file) => setEditUploadedFile('idFrontName', file)} />
                  {editForm.idType === 'NATIONAL_ID' ? (
                    <FileField label={tAdmin('idBackName', 'ID Back File')} value={editUploadedFiles.idBackName?.name} onPick={(file) => setEditUploadedFile('idBackName', file)} />
                  ) : null}
                </section>

                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-2">
                  <h3 className="md:col-span-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('employment', 'Employment')}</h3>
                  <FileField label={tAdmin('applicantPhotoName', 'Applicant Photo')} value={editUploadedFiles.applicantPhotoName?.name} onPick={(file) => setEditUploadedFile('applicantPhotoName', file)} />
                  <FileField label={tAdmin('filledFormName', 'Filled Form')} value={editUploadedFiles.filledFormName?.name} onPick={(file) => setEditUploadedFile('filledFormName', file)} />
                </section>

                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-3">
                  <h3 className="md:col-span-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('preferencesAndConsent', 'Preferences & Consent')}</h3>
                  <Field label={tAdmin('membershipPaymentAmountLabel', 'Membership Payment Amount')}>
                    <Input type="number" step="0.01" placeholder="e.g. 500" value={editForm.membershipPaymentAmount} onChange={(event) => updateEditField('membershipPaymentAmount', event.target.value)} />
                  </Field>
                  <FileField label={tAdmin('membershipPaymentProofName', 'Membership Payment Proof')} value={editUploadedFiles.membershipPaymentProofName?.name} onPick={(file) => setEditUploadedFile('membershipPaymentProofName', file)} />
                  <Field label={tAdmin('savingTypeLabel', 'Saving Type')}>
                    <select className="h-10 w-full rounded-md border px-3" value={editForm.savingType} onChange={(event) => updateEditField('savingType', event.target.value)}>
                      <option value="">{tAdmin('selectOne', 'Select one')}</option>
                      {SAVING_TYPE_OPTIONS.map((savingType) => (
                        <option key={savingType} value={savingType}>{savingType.split('_').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ')}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={tAdmin('savingPaymentAmountLabel', 'Saving Payment Amount')}>
                    <Input type="number" step="0.01" placeholder="e.g. 250" value={editForm.savingPaymentAmount} onChange={(event) => updateEditField('savingPaymentAmount', event.target.value)} />
                  </Field>
                  <Field label={tAdmin('savingTransactionRefLabel', 'Saving Transaction Ref')}><Input placeholder="e.g. TXN-123456" value={editForm.savingTransactionRef} onChange={(event) => updateEditField('savingTransactionRef', event.target.value)} /></Field>
                  <FileField label={tAdmin('savingProofName', 'Saving Proof')} value={editUploadedFiles.savingProofName?.name} onPick={(file) => setEditUploadedFile('savingProofName', file)} />
                  <div className="flex items-center gap-2 pt-7">
                    <Checkbox checked={editForm.termsAccepted} onCheckedChange={(checked) => updateEditField('termsAccepted', checked === true)} id="editMemberTerms" />
                    <Label htmlFor="editMemberTerms">{tAdmin('termsAcceptedLabel', 'Terms accepted')}</Label>
                  </div>
                </section>

                <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-background/95 pt-4 backdrop-blur">
                  <Button type="button" variant="outline" onClick={closeEditDialog} disabled={editSaving}>{tAdmin('cancel', 'Cancel')}</Button>
                  <Button type="button" onClick={() => { void saveEditedMember(); }} disabled={editSaving}>
                    {editSaving ? tAdmin('saving', 'Saving...') : tAdmin('saveChanges', 'Save Changes')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="rounded-md p-4 text-sm text-muted-foreground">{tAdmin('loadingMembers', 'Loading members...')}</p> : null}
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-md bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadSeq((value) => value + 1)}>{tAdmin('retry', 'Retry')}</Button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr>
                <th colSpan={8} className="p-4 font-normal">
                  <div className="flex flex-wrap gap-3 text-sm font-normal">
                    <div className="relative min-w-[220px] flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-9" placeholder={tAdmin('searchMembers', 'Search approved members...')} value={search} onChange={(event) => setSearch(event.target.value)} />
                    </div>

                    <select className="h-10 w-[170px] rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                      <option value="all">{tAdmin('allStatuses', 'All Statuses')}</option>
                      {memberStatusOptions.map((status) => (
                        <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>
                      ))}
                    </select>

                    <select className="h-10 w-[180px] rounded-md border border-input bg-background px-3 text-sm" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                      <option value="all">{tAdmin('allBranches', 'All Branches')}</option>
                      {branchOptions.map((branch) => (
                        <option key={branch} value={branch}>{branch === 'UNASSIGNED' ? tAdmin('unassigned', 'Unassigned') : branch}</option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>

              <tr>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('reference', 'Reference')}</th>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('fullName', 'Full Name')}</th>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('phone', 'Phone')}</th>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('applicantType', 'Applicant Type')}</th>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('branch', 'Branch')}</th>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('status', 'Status')}</th>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('date', 'Date')}</th>
                <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => {
                const fullName = [member.applicant.firstName, member.applicant.middleName, member.applicant.lastName].filter((part) => Boolean(part && part.trim())).join(' ');
                return (
                  <tr key={member.id} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/70 last:border-0" onClick={() => { void handleOpenEdit(member); }}>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs font-medium text-primary break-words`}>{member.referenceNo}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-foreground break-words`}>{fullName}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{member.applicant.phone}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{member.applicantType}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{member.branch?.name || tAdmin('emDash', '—')}</td>
                    <td className={density === 'compact' ? 'p-1.5' : 'p-2'}><StatusBadge status={member.status} /></td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{new Date(member.reviewedAt || member.updatedAt || member.submittedAt || Date.now()).toLocaleDateString()}</td>
                    <td className={density === 'compact' ? 'p-1.5' : 'p-2'} onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="gap-1.5" title={tAdmin('editMember', 'Edit Member')} onClick={() => { void handleOpenEdit(member); }}>
                          <Pencil className="h-4 w-4 text-blue-700" />
                          {tAdmin('edit', 'Edit')}
                        </Button>
                        {canDeleteMembers ? (
                          <Button variant="ghost" size="sm" className="gap-1.5" title={tAdmin('deleteMember', 'Delete Member')} onClick={() => setPendingAction({ type: 'delete', member })}>
                            <Trash2 className="h-4 w-4 text-red-700" />
                            {tAdmin('delete', 'Delete')}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="gap-1.5" title={tAdmin('onlySuperAdminCanDelete', 'Only SUPER_ADMIN can delete')} disabled>
                            <Trash2 className="h-4 w-4 text-red-300" />
                            {tAdmin('delete', 'Delete')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">{tAdmin('noMembersFound', 'No approved members found.')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-100 p-3 text-sm text-muted-foreground rounded-b-2xl">
            <p>
              {tAdmin('showingRangeOfTotal', 'Showing {{start}}-{{end}} of {{total}}', {
                start: applications.length === 0 ? 0 : (page - 1) * limit + 1,
                end: Math.min(page * limit, total),
                total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{tAdmin('previous', 'Previous')}</Button>
              <span>{tAdmin('pageOf', 'Page {{page}} / {{totalPages}}', { page, totalPages: Math.max(1, totalPages) })}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>{tAdmin('next', 'Next')}</Button>
            </div>
          </div>
        </div>
      ) : null}

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === 'delete' ? tAdmin('deleteMemberApplication', 'Delete Member Application') : tAdmin('deactivateMember', 'Deactivate Member')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'delete'
                ? tAdmin('confirmDeleteMemberApplication', 'You are about to permanently delete {{referenceNo}}. This cannot be undone.', {
                  referenceNo: pendingAction.member.referenceNo,
                })
                : tAdmin('confirmDeactivateMember', 'You are about to deactivate {{referenceNo}}. This will move status back to APPROVED.', {
                  referenceNo: pendingAction?.member.referenceNo || '',
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tAdmin('cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void runPendingAction(); }}>{tAdmin('confirm', 'Confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
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
