import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { APPLICATION_STATUS_OPTIONS, LOAN_TYPE_OPTIONS } from '@/lib/adminOptions';
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
import { loanTypeRules } from '@/schemas/loanSchema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import {Textarea } from '@/components/ui/textarea';
const baseUrl = getApiBaseUrl();

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
    middleName?: string | null;
    lastName?: string | null;
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

type LoanDetailResponse = {
  application: {
    id: string;
    referenceNo: string;
    status: string;
    registeredMobile?: string | null;
    idType?: string | null;
    maritalStatus?: string | null;
    membershipNo?: string | null;
    loanType?: string | null;
    amount?: number | null;
    tenure?: number | null;
    collateralType?: string | null;
    collateralDesc?: string | null;
    termsAccepted: boolean;
    creditConsent: boolean;
    signature?: string | null;
    branch?: {
      id?: string;
      name?: string;
    } | null;
    documents: Array<{
      id: string;
      category: string;
      originalName: string;
      status: string;
    }>;
    applicant: {
      firstName: string;
      middleName?: string | null;
      lastName?: string | null;
      phone: string;
      email?: string | null;
    };
  };
};

type EditableLoanForm = {
  email: string;
  membershipNo: string;
  registeredMobile: string;
  idType: string;
  maritalStatus: string;
  loanType: string;
  branchId: string;
  amount: number;
  tenure: number;
  collateralType: string;
  collateralDesc: string;
  termsAccepted: boolean;
  creditConsent: boolean;
};

type LoanFileField =
  | 'loanApplicationLetter'
  | 'loanRequestForm'
  | 'personalPhoto'
  | 'idFrontPhoto'
  | 'idBackPhoto'
  | 'marriageCertificate'
  | 'collateralDocument'
  | 'businessPlan';

const loanDocumentUploads = [
  { field: 'loanApplicationLetter', category: 'LOAN_APPLICATION_LETTER' },
  { field: 'loanRequestForm', category: 'LOAN_REQUEST_FORM' },
  { field: 'personalPhoto', category: 'PERSONAL_PHOTO' },
  { field: 'idFrontPhoto', category: 'NATIONAL_ID_FRONT' },
  { field: 'idBackPhoto', category: 'NATIONAL_ID_BACK' },
  { field: 'marriageCertificate', category: 'MARRIAGE_CERTIFICATE' },
  { field: 'collateralDocument', category: 'COLLATERAL_DOCUMENT' },
  { field: 'businessPlan', category: 'BUSINESS_PLAN' },
] as const;

const toNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const uploadLoanDocument = async (applicationId: string, file: File, category: string): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await fetch(`${baseUrl}/api/applications/${applicationId}/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to upload ${file.name}`);
  }
};

export default function LoansList() {
  const { tAdmin } = useAdminI18n();
  const { branches, branchNames } = useAdminBranches();
  const currentUser = useMemo(() => getAdminUser(), []);
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
  const [density] = useState<'compact' | 'comfortable'>('comfortable');
  const [reloadSeq, setReloadSeq] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'APPROVED' | 'ACTIVATED'>('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [openEdit, setOpenEdit] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanApplication | null>(null);
  const [editForm, setEditForm] = useState<EditableLoanForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDocuments, setEditDocuments] = useState<Array<{ id: string; category: string; originalName: string; status: string }>>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<Partial<Record<LoanFileField, File>>>({});
  const [pendingAction, setPendingAction] = useState<{ type: 'deactivate' | 'delete'; loan: LoanApplication } | null>(null);

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
      params.set('status', statusFilter === 'all' ? 'APPROVED,ACTIVATED' : statusFilter);
      if (search.trim()) params.set('search', search.trim());
      if (loanTypeFilter !== 'all') params.set('loanType', loanTypeFilter);
      if (branchFilter !== 'all') params.set('branchName', branchFilter);

      const response = await adminFetch<LoanListResponse>(`/api/loans?${params.toString()}`);
      setApplications(response.applications);
      setTotal(response.pagination?.total ?? response.applications.length);
      setTotalPages(response.pagination?.totalPages ?? 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tAdmin('failedLoadApprovedLoans', 'Failed to load approved loans'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, search, statusFilter, loanTypeFilter, branchFilter, tAdmin]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, loanTypeFilter, branchFilter, limit, sortBy, sortOrder]);

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
      if (event.key !== 'admin:application-updated' || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as { applicationType?: string };
        if (!payload.applicationType || payload.applicationType === 'loan') {
          void loadApprovedLoans();
        }
      } catch {
        // Ignore invalid payloads.
      }
    };

    const handleFocus = () => {
      void loadApprovedLoans();
    };

    window.addEventListener('admin:application-updated', handleApplicationUpdated as EventListener);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('admin:application-updated', handleApplicationUpdated as EventListener);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadApprovedLoans]);

  const approvedLoans = useMemo(() => applications, [applications]);

  const loanTypeOptions = useMemo(() => {
    return [...LOAN_TYPE_OPTIONS].sort((a, b) => a.localeCompare(b));
  }, []);

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

  const setEditUploadedFile = (field: LoanFileField, file: File | null) => {
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

  const approvedStatusOptions = APPLICATION_STATUS_OPTIONS.filter((status) => status === 'APPROVED' || status === 'ACTIVATED');

  const loanTypeLabel: Record<string, string> = {
    REGULAR_LOAN: tAdmin('loanTypeRegular', 'Regular Loan'),
    SPECIAL_SHORT_TERM_LOAN: tAdmin('loanTypeSpecialShortTerm', 'Special Short Term Loan'),
    SHORT_TERM_LOAN: tAdmin('loanTypeShortTerm', 'Short Term Loan'),
    INTERMEDIATE_TERM_LOAN: tAdmin('loanTypeIntermediate', 'Intermediate Term Loan'),
    LONG_TERM_LOAN: tAdmin('loanTypeLongTerm', 'Long Term Loan'),
    NON_INTERESTS_LOAN: tAdmin('loanTypeNonInterest', 'Non-Interest Loan'),
    VEHICLES_AND_HOUSE_LOAN: tAdmin('loanTypeVehicleHouse', 'Vehicles & House Loan'),
  };

  const handleOpenEdit = async (loan: LoanApplication) => {
    setEditingLoan(loan);
    setOpenEdit(true);
    setEditLoading(true);

    try {
      const response = await adminFetch<LoanDetailResponse>(`/api/loans/${loan.id}`);
      const detail = response.application;

      setEditForm({
        email: detail.applicant.email || '',
        membershipNo: detail.membershipNo || '',
        registeredMobile: detail.registeredMobile || detail.applicant.phone || '',
        idType: detail.idType || '',
        maritalStatus: detail.maritalStatus || 'SINGLE',
        loanType: detail.loanType || 'PERSONAL',
        amount: detail.amount || 0,
        tenure: detail.tenure || 12,
        collateralType: detail.collateralType || '',
        collateralDesc: detail.collateralDesc || '',
        termsAccepted: Boolean(detail.termsAccepted),
        creditConsent: Boolean(detail.creditConsent),
        branchId: detail.branch?.id || '',
      });
      setEditDocuments(detail.documents || []);
      setEditUploadedFiles({});
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : tAdmin('failedLoadLoanDetails', 'Failed to load loan details'));
      setOpenEdit(false);
      setEditingLoan(null);
      setEditForm(null);
      setEditDocuments([]);
      setEditUploadedFiles({});
    } finally {
      setEditLoading(false);
    }
  };

  const updateEditField = <K extends keyof EditableLoanForm>(field: K, value: EditableLoanForm[K]) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const closeEditDialog = () => {
    if (editSaving) return;
    setOpenEdit(false);
    setEditingLoan(null);
    setEditForm(null);
    setEditLoading(false);
    setEditDocuments([]);
    setEditUploadedFiles({});
  };

  const saveEditedLoan = async () => {
    if (!editingLoan || !editForm) {
      return;
    }

    setEditSaving(true);
    try {
      await adminFetch(`/api/loans/${editingLoan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: editingLoan.applicant.firstName,
          middleName: editingLoan.applicant.middleName || undefined,
          lastName: editingLoan.applicant.lastName,
          phone: editingLoan.applicant.phone,
          email: editForm.email || undefined,
          membershipNo: editForm.membershipNo || undefined,
          registeredMobile: editForm.registeredMobile || undefined,
          idType: editForm.idType || undefined,
          maritalStatus: editForm.maritalStatus || undefined,
          loanType: editForm.loanType,
          preferredBranch: branches.find((branch) => branch.id === editForm.branchId)?.name || '',
          amount: editForm.amount,
          tenure: editForm.tenure,
          collateralType: editForm.collateralType || undefined,
          collateralDesc: editForm.collateralDesc || undefined,
          termsAccepted: editForm.termsAccepted,
          creditConsent: editForm.creditConsent,
          branchId: editForm.branchId || undefined,
        }),
      });

      const uploads: Array<{ file: File; field: LoanFileField }> = [];
      for (const upload of loanDocumentUploads) {
        const file = editUploadedFiles[upload.field];
        if (file) {
          uploads.push({ file, field: upload.field });
        }
      }

      const failedUploads: string[] = [];
      for (const upload of uploads) {
        try {
          const category = loanDocumentUploads.find((item) => item.field === upload.field)?.category;
          if (!category) {
            continue;
          }

          await uploadLoanDocument(editingLoan.id, upload.file, category);
        } catch {
          failedUploads.push(upload.field);
        }
      }

      if (failedUploads.length > 0) {
        toast.warning(tAdmin('loanUpdatedUploadFailed', 'Loan updated, but failed to upload: {{files}}', { files: failedUploads.join(', ') }));
      } else {
        toast.success(tAdmin('loanUpdatedReference', 'Loan updated: {{referenceNo}}', { referenceNo: editingLoan.referenceNo }));
      }

      closeEditDialog();
      setReloadSeq((value) => value + 1);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : tAdmin('failedUpdateLoan', 'Failed to update loan'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeactivateLoan = async (loan: LoanApplication) => {
    if (loan.status !== 'ACTIVATED') {
      toast.info(tAdmin('loanAlreadyNotActive', '{{referenceNo}} is already not active.', { referenceNo: loan.referenceNo }));
      return;
    }

    try {
      await adminFetch(`/api/admin/applications/loan/${loan.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'APPROVED',
          note: 'Deactivated from loans list',
        }),
      });
      toast.success(tAdmin('loanDeactivatedSuccessfully', '{{referenceNo}} deactivated successfully.', { referenceNo: loan.referenceNo }));
      setReloadSeq((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : tAdmin('failedDeactivateLoan', 'Failed to deactivate loan'));
    }
  };

  const handleDeleteLoan = async (loan: LoanApplication) => {
    try {
      await adminFetch(`/api/admin/applications/loan/${loan.id}`, {
        method: 'DELETE',
      });
      toast.success(tAdmin('loanDeletedSuccessfully', '{{referenceNo}} deleted successfully.', { referenceNo: loan.referenceNo }));
      setReloadSeq((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : tAdmin('failedDeleteLoan', 'Failed to delete loan'));
    }
  };

  const runPendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const selected = pendingAction;
    setPendingAction(null);

    if (selected.type === 'deactivate') {
      await handleDeactivateLoan(selected.loan);
      return;
    }

    await handleDeleteLoan(selected.loan);
  };

  return (
    <section className="space-y-4">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{tAdmin('approvedLoansListHeading', 'Approved Loans List')}</h1>
          <p className="text-sm text-muted-foreground">{tAdmin('approvedLoansListSubheading', 'All approved and activated loan applications')}</p>
        </div>


        <Dialog open={openEdit} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
          <DialogContent className="max-h-[92vh] w-[92vw] overflow-y-auto sm:max-w-[92vw] xl:max-w-7xl">
            <DialogHeader>
              <DialogTitle>{tAdmin('editLoan', 'Edit Loan')} {editingLoan ? `- ${editingLoan.referenceNo}` : ''}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('reference', 'Reference')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{editingLoan?.referenceNo || tAdmin('emDash', '—')}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('applicant', 'Applicant')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {editingLoan ? [editingLoan.applicant.firstName, editingLoan.applicant.middleName, editingLoan.applicant.lastName].filter((part) => Boolean(part && part.trim())).join(' ') : tAdmin('emDash', '—')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('status', 'Status')}</p>
                <div className="mt-1">{editingLoan ? <StatusBadge status={editingLoan.status} /> : tAdmin('emDash', '—')}</div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('loanType', 'Loan Type')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{editingLoan?.loanType ? (loanTypeLabel[editingLoan.loanType] || editingLoan.loanType) : tAdmin('emDash', '—')}</p>
              </div>
            </div>

            {editLoading || !editForm ? (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-muted-foreground">{tAdmin('loadingLoanDetails', 'Loading loan details...')}</p>
            ) : (
              <div className="space-y-4 pt-1">
                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-3">
                  <h3 className="md:col-span-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('loanApplicantInfo', 'Applicant & Registration')}</h3>
                  <Field label={tAdmin('email', 'Email')}><Input type="email" placeholder="e.g. selam@example.com" value={editForm.email} onChange={(event) => updateEditField('email', event.target.value)} /></Field>
                  <Field label={tAdmin('membershipNumberLabel', 'Membership Number')}><Input placeholder="e.g. MEM-2026-000123" value={editForm.membershipNo} onChange={(event) => updateEditField('membershipNo', event.target.value)} /></Field>
                  <Field label={tAdmin('registeredMobile', 'Registered Mobile')}><Input placeholder="e.g. +251911223344" value={editForm.registeredMobile} onChange={(event) => updateEditField('registeredMobile', event.target.value)} /></Field>
                  <Field label={tAdmin('idTypeLabel', 'ID Type')}>
                    <select className="h-10 w-full rounded-md border px-3" value={editForm.idType} onChange={(event) => updateEditField('idType', event.target.value)}>
                      <option value="">{tAdmin('selectOne', 'Select one')}</option>
                      <option value="NATIONAL_ID">{tAdmin('nationalIdLabel', 'National ID')}</option>
                      <option value="PASSPORT">{tAdmin('passport', 'Passport')}</option>
                      <option value="DRIVING_LICENSE">{tAdmin('drivingLicense', 'Driving License')}</option>
                      <option value="STUDENT_ID">{tAdmin('studentId', 'Student ID')}</option>
                      <option value="KEBELE_ID">{tAdmin('kebeleId', 'Kebele ID')}</option>
                    </select>
                  </Field>
                  <Field label={tAdmin('maritalStatus', 'Marital Status')}>
                    <select className="h-10 w-full rounded-md border px-3" value={editForm.maritalStatus} onChange={(event) => updateEditField('maritalStatus', event.target.value)}>
                      <option value="SINGLE">{tAdmin('single', 'Single')}</option>
                      <option value="MARRIED">{tAdmin('married', 'Married')}</option>
                    </select>
                  </Field>
                </section>

                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-3">
                  <h3 className="md:col-span-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('loanDetails', 'Loan Details')}</h3>
                  <Field label={tAdmin('loanTypeLabel', 'Loan Type')}>
                    <select className="h-10 w-full rounded-md border px-3" value={editForm.loanType} onChange={(event) => updateEditField('loanType', event.target.value)}>
                      {LOAN_TYPE_OPTIONS.map((loanType) => (
                        <option key={loanType} value={loanType}>{loanTypeLabel[loanType] || loanType}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={tAdmin('branch', 'Branch')}>
                    <select className="h-10 w-full rounded-md border px-3" value={editForm.branchId} onChange={(event) => updateEditField('branchId', event.target.value)}>
                      <option value="">{tAdmin('unassigned', 'Unassigned')}</option>
                      {[...branches].sort((a, b) => a.name.localeCompare(b.name)).map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={tAdmin('amount', 'Loan Amount (ETB)')}><Input type="number" min={0} placeholder="0" value={editForm.amount} onChange={(event) => updateEditField('amount', toNumber(event.target.value))} /></Field>
                  <Field label={tAdmin('tenure', 'Tenure (Months)')}>
                    <select className="h-10 w-full rounded-md border px-3" value={String(editForm.tenure)} onChange={(event) => updateEditField('tenure', toNumber(event.target.value))}>
                      {(loanTypeRules[editForm.loanType as keyof typeof loanTypeRules]?.tenures || [12, 24, 36, 48, 60]).map((month) => (
                        <option key={month} value={month}>{month} {tAdmin('months', 'months')}</option>
                      ))}
                    </select>
                  </Field>
                </section>

                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-3">
                  <h3 className="md:col-span-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('documents', 'Submitted Documents')}</h3>
                  {editDocuments.length > 0 ? (
                    <div className="md:col-span-3 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                      {editDocuments.map((doc) => (
                        <p key={doc.id}>{doc.category}: {doc.originalName} ({doc.status})</p>
                      ))}
                    </div>
                  ) : (
                    <div className="md:col-span-3 rounded-md bg-slate-50 p-3 text-xs text-slate-500">{tAdmin('noUploadedDocumentsYet', 'No uploaded documents yet.')}</div>
                  )}
                  <FileField label={tAdmin('loanApplicationLetter', 'Loan Application Letter')} onPick={(file) => setEditUploadedFile('loanApplicationLetter', file)} value={editUploadedFiles.loanApplicationLetter?.name} />
                  <FileField label={tAdmin('loanRequestForm', 'Loan Request Form')} onPick={(file) => setEditUploadedFile('loanRequestForm', file)} value={editUploadedFiles.loanRequestForm?.name} />
                  <FileField label={tAdmin('personalPhoto', 'Personal Photo')} onPick={(file) => setEditUploadedFile('personalPhoto', file)} value={editUploadedFiles.personalPhoto?.name} />
                  <FileField label={tAdmin('idFrontPhoto', 'ID Front Photo')} onPick={(file) => setEditUploadedFile('idFrontPhoto', file)} value={editUploadedFiles.idFrontPhoto?.name} />
                  <FileField label={tAdmin('idBackPhoto', 'ID Back Photo')} onPick={(file) => setEditUploadedFile('idBackPhoto', file)} value={editUploadedFiles.idBackPhoto?.name} />
                  <FileField label={tAdmin('marriageCertificate', 'Marriage Certificate')} onPick={(file) => setEditUploadedFile('marriageCertificate', file)} value={editUploadedFiles.marriageCertificate?.name} />
                  <FileField label={tAdmin('collateralDocument', 'Collateral Document')} onPick={(file) => setEditUploadedFile('collateralDocument', file)} value={editUploadedFiles.collateralDocument?.name} />
                  <FileField label={tAdmin('businessPlan', 'Business Plan')} onPick={(file) => setEditUploadedFile('businessPlan', file)} value={editUploadedFiles.businessPlan?.name} />
                </section>

                <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:grid-cols-3">
                  <h3 className="md:col-span-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{tAdmin('collateralAndConsent', 'Collateral & Consent')}</h3>
                  <Field label={tAdmin('collateralTypeLabel', 'Collateral Type')}><Input placeholder="e.g., Land, Building, Vehicle" value={editForm.collateralType} onChange={(event) => updateEditField('collateralType', event.target.value)} /></Field>
                  <div className="md:col-span-2">
                    <Field label={tAdmin('collateralDescriptionLabel', 'Collateral Description')}><Textarea rows={2} placeholder="Describe the collateral details" value={editForm.collateralDesc} onChange={(event) => updateEditField('collateralDesc', event.target.value)} /></Field>
                  </div>
                  <div className="md:col-span-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-slate-200 p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={editForm.termsAccepted} onCheckedChange={(checked) => updateEditField('termsAccepted', checked === true)} id="editLoanTerms" />
                        <Label htmlFor="editLoanTerms">{tAdmin('termsAcceptedLabel', 'Terms accepted')}</Label>
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={editForm.creditConsent} onCheckedChange={(checked) => updateEditField('creditConsent', checked === true)} id="editLoanCredit" />
                        <Label htmlFor="editLoanCredit">{tAdmin('creditConsentAcceptedLabel', 'Credit consent accepted')}</Label>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-background/95 pt-4 backdrop-blur">
                  <Button type="button" variant="outline" onClick={closeEditDialog} disabled={editSaving}>{tAdmin('cancel', 'Cancel')}</Button>
                  <Button type="button" onClick={() => { void saveEditedLoan(); }} disabled={editSaving}>{editSaving ? tAdmin('saving', 'Saving...') : tAdmin('saveChanges', 'Save Changes')}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="rounded-md p-4 text-sm text-muted-foreground">{tAdmin('loadingApprovedLoans', 'Loading approved loans...')}</p> : null}
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
              <th colSpan={9} className="p-4 font-normal">
                <div className="flex flex-wrap gap-3 text-sm font-normal">
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder={tAdmin('searchApprovedLoans', 'Search approved loans...')} value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>

                  <select className="h-10 w-[170px] rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'APPROVED' | 'ACTIVATED')}>
                    <option value="all">{tAdmin('allStatuses', 'All Statuses')}</option>
                    {approvedStatusOptions.map((status) => (
                      <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>
                    ))}
                  </select>

                  <select className="h-10 w-[180px] rounded-md border border-input bg-background px-3 text-sm" value={loanTypeFilter} onChange={(event) => setLoanTypeFilter(event.target.value)}>
                    <option value="all">{tAdmin('allLoanTypes', 'All Loan Types')}</option>
                    {loanTypeOptions.map((type) => (
                      <option key={type} value={type}>{loanTypeLabel[type] || type}</option>
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
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('applicant', 'Applicant')}</th>
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('phone', 'Phone')}</th>
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('membershipNo', 'Membership No')}</th>
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('loanType', 'Loan Type')}</th>
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('amount', 'Amount')}</th>
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('status', 'Status')}</th>
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('approvedDate', 'Approved Date')}</th>
              <th className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-left text-xs font-semibold text-foreground border-b border-slate-200`}>{tAdmin('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {approvedLoans.map((loan) => {
                const fullName = [loan.applicant.firstName, loan.applicant.middleName, loan.applicant.lastName].filter((part) => Boolean(part && part.trim())).join(' ');
                return (
                  <tr key={loan.id} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/70 last:border-0" onClick={() => { void handleOpenEdit(loan); }}>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs font-medium text-primary break-words`}>{loan.referenceNo}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-foreground break-words`}>{fullName}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{loan.applicant.phone}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{loan.membershipNo || tAdmin('emDash', '—')}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{loan.loanType ? (loanTypeLabel[loan.loanType] || loan.loanType) : tAdmin('emDash', '—')}</td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{loan.amount ? `${loan.amount.toLocaleString()} ETB` : tAdmin('emDash', '—')}</td>
                    <td className={density === 'compact' ? 'p-1.5' : 'p-2'}><StatusBadge status={loan.status} /></td>
                    <td className={`${density === 'compact' ? 'p-1.5' : 'p-2'} text-xs text-muted-foreground break-words`}>{new Date(loan.reviewedAt || loan.updatedAt || loan.submittedAt || Date.now()).toLocaleDateString()}</td>
                    <td className={density === 'compact' ? 'p-1.5' : 'p-2'} onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="gap-1.5" title={tAdmin('editLoan', 'Edit Loan')} onClick={() => { void handleOpenEdit(loan); }}>
                          <Pencil className="h-4 w-4 text-blue-700" />
                          {tAdmin('edit', 'Edit')}
                        </Button>
                        {canDeleteLoans ? (
                          <Button variant="ghost" size="sm" className="gap-1.5" title={tAdmin('deleteLoan', 'Delete Loan')} onClick={() => setPendingAction({ type: 'delete', loan })}>
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
              {approvedLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">{tAdmin('noApprovedLoansFound', 'No approved loans found.')}</td>
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
              {pendingAction?.type === 'delete' ? tAdmin('deleteLoanApplication', 'Delete Loan Application') : tAdmin('deactivateLoan', 'Deactivate Loan')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'delete'
                ? tAdmin('confirmDeleteLoanApplication', 'You are about to permanently delete {{referenceNo}}. This cannot be undone.', {
                  referenceNo: pendingAction.loan.referenceNo,
                })
                : tAdmin('confirmDeactivateLoan', 'You are about to deactivate {{referenceNo}}. This will move status back to APPROVED.', {
                  referenceNo: pendingAction?.loan.referenceNo || '',
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
