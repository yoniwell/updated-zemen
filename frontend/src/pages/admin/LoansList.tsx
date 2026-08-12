import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { APPLICATION_STATUS_OPTIONS } from '@/lib/adminOptions';
import { useAdminLoanTypes } from '@/hooks/useAdminLoanTypes';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';
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
import { genericTenures } from '@/schemas/loanSchema';
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

type LoanDetailResponse = {
  application: {
    id: string;
    referenceNo: string;
    status: string;

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
      fathersName?: string | null;
      grandfathersName?: string | null;
      phone: string;
      email?: string | null;
    };
  };
};

type EditableLoanForm = {
  email: string;
  membershipNo: string;
  phone: string;
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
  const { loanTypes, loanTypeNames } = useAdminLoanTypes();
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

  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [openEdit, setOpenEdit] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanApplication | null>(null);
  const [editForm, setEditForm] = useState<EditableLoanForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDocuments, setEditDocuments] = useState<Array<{ id: string; category: string; originalName: string; status: string }>>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<Partial<Record<LoanFileField, File>>>({});
  const [deleteTarget, setDeleteTarget] = useState<LoanApplication | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
    setPage(1);
  }, [search, loanTypeFilter, branchFilter, limit, sortBy, sortOrder]);

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
    return [...loanTypeNames].sort((a, b) => a.localeCompare(b));
  }, [loanTypeNames]);



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
        phone: detail.applicant.phone || '',
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
          fathersName: editingLoan.applicant.fathersName || undefined,
          grandfathersName: editingLoan.applicant.grandfathersName,
          phone: editForm.phone || undefined,
          email: editForm.email || undefined,
          membershipNo: editForm.membershipNo || undefined,
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
    // Removed because ACTIVATED status is deprecated.
  };

  const handleDeleteLoan = async (loan: LoanApplication) => {
    try {
      await adminFetch(`/api/loans/${loan.id}`, {
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
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* 2.1 Page Header & Primary Actions */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tAdmin('approvedLoansListHeading', 'Approved Loans List')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{tAdmin('approvedLoansListSubheading', 'All approved loan applications')}</p>
        </div>
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
                {editingLoan ? [editingLoan.applicant.firstName, editingLoan.applicant.fathersName, editingLoan.applicant.grandfathersName].filter((part) => Boolean(part && part.trim())).join(' ') : tAdmin('emDash', '—')}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('status', 'Status')}</p>
              <div className="mt-1">{editingLoan ? <StatusBadge status={editingLoan.status} /> : tAdmin('emDash', '—')}</div>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tAdmin('loanType', 'Loan Type')}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{editingLoan?.loanType || tAdmin('emDash', '—')}</p>
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
                <Field label={tAdmin('phone', 'Phone Number')}><Input placeholder="e.g. +251911223344" value={editForm.phone} onChange={(event) => updateEditField('phone', event.target.value)} /></Field>
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

              <section className="grid gap-5 md:grid-cols-3 mb-6">
                <h3 className="md:col-span-3 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">{tAdmin('loanDetails', 'Loan Details')}</h3>
                <Field label={tAdmin('loanTypeLabel', 'Loan Type')}>
                  <select className="h-10 w-full rounded-lg bg-slate-50 border-transparent px-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" value={editForm.loanType} onChange={(event) => updateEditField('loanType', event.target.value)}>
                    {loanTypeNames.map((loanType) => (
                      <option key={loanType} value={loanType}>{loanType}</option>
                    ))}
                  </select>
                </Field>
                <Field label={tAdmin('branch', 'Branch')}>
                  <select className="h-10 w-full rounded-lg bg-slate-50 border-transparent px-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" value={editForm.branchId} onChange={(event) => updateEditField('branchId', event.target.value)}>
                    <option value="">{tAdmin('unassigned', 'Unassigned')}</option>
                    {[...branches].sort((a, b) => a.name.localeCompare(b.name)).map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={tAdmin('amount', 'Loan Amount (ETB)')}><Input type="number" min={0} placeholder="0" value={editForm.amount} onChange={(event) => updateEditField('amount', toNumber(event.target.value))} /></Field>
                <Field label={tAdmin('tenure', 'Tenure (Months)')}>
                  <select className="h-10 w-full rounded-lg bg-slate-50 border-transparent px-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" value={String(editForm.tenure)} onChange={(event) => updateEditField('tenure', toNumber(event.target.value))}>
                    {(() => {
                      const selected = loanTypes.find((lt) => lt.name === editForm.loanType);
                      const fixed = selected?.maxTenure ?? null;
                      let tenures = genericTenures;
                      if (fixed != null) {
                        tenures = [fixed];
                      }
                      return tenures.map((month) => (
                        <option key={month} value={month}>{month} {tAdmin('months', 'months')}</option>
                      ));
                    })()}
                  </select>
                </Field>
              </section>

              <section className="grid gap-5 md:grid-cols-3 mb-6">
                <h3 className="md:col-span-3 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">{tAdmin('documents', 'Submitted Documents')}</h3>
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

              <section className="grid gap-5 md:grid-cols-3 mb-6">
                <h3 className="md:col-span-3 text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">{tAdmin('collateralAndConsent', 'Collateral & Consent')}</h3>
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

      {/* 2.2 Filter & Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={tAdmin('searchApprovedLoans', 'Search approved loans...')} 
            value={search} 
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" 
          />
        </div>

        <select 
          className="bg-white shadow-sm border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer transition-shadow" 
          value={loanTypeFilter} 
          onChange={(event) => setLoanTypeFilter(event.target.value)}
        >
          <option value="all">{tAdmin('allLoanTypes', 'All Loan Types')}</option>
          {loanTypeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
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

      {loading ? <p className="rounded-md p-4 text-sm text-muted-foreground">{tAdmin('loadingApprovedLoans', 'Loading approved loans...')}</p> : null}
      
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
                  const fullName = [loan.applicant.firstName, loan.applicant.fathersName, loan.applicant.grandfathersName].filter((part) => Boolean(part && part.trim())).join(' ');
                  return (
                    <tr key={loan.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => { void handleOpenEdit(loan); }}>
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
                            title={tAdmin('editLoan', 'Edit Loan')} 
                            onClick={() => { void handleOpenEdit(loan); }}
                          >
                            <Pencil className="w-5 h-5" />
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
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">{tAdmin('noApprovedLoansFound', 'No approved loans found.')}</td>
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
