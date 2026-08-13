import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { AdminApiError, adminFetch } from '@/lib/adminApi';
import { getAdminUser } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/adminRbac';

import { toast } from 'sonner';
import ContextHelp from '@/components/admin/ContextHelp';
import { useAdminI18n } from '@/lib/uiI18n';
import { Link, useParams } from 'react-router-dom';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const baseUrl = getApiBaseUrl();

type DetailPayload = {
  id: string;
  referenceNo: string;
  status: string;
  updatedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  applicant: {
    firstName: string;
    fathersName?: string | null;
    grandfathersName?: string | null;
    phone: string;
    email?: string | null;
    idNumber?: string | null;
  };
  branch?: {
    id: string;
    name: string;
  } | null;

  membershipPaymentAmount?: number | null;
  membershipTransactionRef?: string | null;
  savingType?: string | null;
  savingPaymentAmount?: number | null;
  savingTransactionRef?: string | null;

  termsAccepted?: boolean | null;
  privacyAccepted?: boolean | null;
  signature?: string | null;
  membershipNo?: string | null;

  idType?: string | null;
  maritalStatus?: string | null;
  amount?: number | null;
  loanType?: string | null;
  tenure?: number | null;

  guarantorIdNumber?: string | null;
  collateralType?: string | null;
  collateralDesc?: string | null;
  creditConsent?: boolean | null;
  documents: Array<{
    id: string;
    category: string;
    status: string;
    uploadedAt: string;
    originalName: string;
    storedName: string;
    rejectionReason?: string | null;
  }>;
  notes: Array<{
    id: string;
    content: string;
    isInternal: boolean;
    createdAt: string;
    author: {
      name: string;
      role: string;
    };
  }>;
  workflow: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    note?: string | null;
    createdAt: string;
    changedBy: {
      name: string;
    };
  }>;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
};

type QueueLookupResponse = {
  applications: Array<{
    id: string;
    referenceNo: string;
  }>;
  total: number;
};

type DetailTabKey = 'application' | 'documents' | 'notes' | 'timeline';
const labelizeStatus = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-primary/10 text-primary',
  UNDER_REVIEW: 'bg-info/10 text-info',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-accent/10 text-accent',
};

const documentStatusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  VERIFIED: 'bg-success/10 text-success',
  REJECTED: 'bg-accent/10 text-accent',
  FLAGGED: 'bg-info/10 text-info',
  EXPIRED: 'bg-muted text-muted-foreground',
};

const statusTransitionMap: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

const findStatusPath = (fromStatus: string, toStatus: string): string[] | null => {
  if (fromStatus === toStatus) {
    return [];
  }

  const queue: Array<{ status: string; path: string[] }> = [{ status: fromStatus, path: [] }];
  const visited = new Set<string>([fromStatus]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const nextStatuses = statusTransitionMap[current.status] || [];
    for (const nextStatus of nextStatuses) {
      if (visited.has(nextStatus)) continue;
      const nextPath = [...current.path, nextStatus];
      if (nextStatus === toStatus) {
        return nextPath;
      }
      visited.add(nextStatus);
      queue.push({ status: nextStatus, path: nextPath });
    }
  }

  return null;
};

export default function ApplicationDetail() {
  const { tAdmin } = useAdminI18n();
  const { type, id } = useParams();
  const currentUser = useMemo(() => getAdminUser(), []);
  const [application, setApplication] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTabKey>('application');
  const [error, setError] = useState<string | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<string>('');
  const [noteInput, setNoteInput] = useState('');
  const applicationType = type === 'loan' ? 'loan' : 'membership';
  const backToQueue = applicationType === 'loan' ? '/admin/loan-queue' : '/admin/membership-queue';

  const [rejectAppModalOpen, setRejectAppModalOpen] = useState(false);
  const [rejectAppReason, setRejectAppReason] = useState('');
  const [rejectDocTarget, setRejectDocTarget] = useState<{ id: string; category: string; originalName: string } | null>(null);
  const [rejectDocReason, setRejectDocReason] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    fathersName: '',
    grandfathersName: '',
    phone: '',
    email: '',
    amount: '',
    membershipPaymentAmount: '',
    savingPaymentAmount: '',
    savingType: '',
    savingTransactionRef: '',
  });

  const canApprove = useMemo(
    () => hasPermission(currentUser, applicationType === 'loan' ? 'loans:approve' : 'membership:approve'),
    [currentUser, applicationType]
  );
  const canWrite = useMemo(
    () => hasPermission(currentUser, applicationType === 'loan' ? 'loans:write' : 'membership:write'),
    [currentUser, applicationType]
  );
  const canVerifyDocs = useMemo(() => hasPermission(currentUser, 'documents:verify'), [currentUser]);

  const handleOpenEditModal = () => {
    if (!application) return;
    setEditForm({
      firstName: application.applicant?.firstName || '',
      fathersName: application.applicant?.fathersName || '',
      grandfathersName: application.applicant?.grandfathersName || '',
      phone: application.applicant?.phone || '',
      email: application.applicant?.email || '',
      amount: application.amount?.toString() || '',
      membershipPaymentAmount: application.membershipPaymentAmount?.toString() || '',
      membershipTransactionRef: application.membershipTransactionRef || '',
      savingPaymentAmount: application.savingPaymentAmount?.toString() || '',
      savingType: application.savingType || '',
      savingTransactionRef: application.savingTransactionRef || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEditDetails = async () => {
    if (!resolvedApplicationId) return;
    setEditSaving(true);
    try {
      if (applicationType === 'loan') {
        await adminFetch(`/api/loans/${resolvedApplicationId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            firstName: editForm.firstName.trim() || undefined,
            fathersName: editForm.fathersName.trim() || undefined,
            grandfathersName: editForm.grandfathersName.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
            email: editForm.email.trim() || undefined,
            amount: editForm.amount ? Number(editForm.amount) : undefined,
          }),
        });
      } else {
        await adminFetch(`/api/membership/${resolvedApplicationId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            firstName: editForm.firstName.trim() || undefined,
            fathersName: editForm.fathersName.trim() || undefined,
            grandfathersName: editForm.grandfathersName.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
            email: editForm.email.trim() || undefined,
            membershipPaymentAmount: editForm.membershipPaymentAmount ? Number(editForm.membershipPaymentAmount) : undefined,
            membershipTransactionRef: editForm.membershipTransactionRef.trim() || undefined,
            savingType: editForm.savingType.trim() || undefined,
            savingPaymentAmount: editForm.savingPaymentAmount ? Number(editForm.savingPaymentAmount) : undefined,
            savingTransactionRef: editForm.savingTransactionRef.trim() || undefined,
          }),
        });
      }

      toast.success(tAdmin('detailsUpdatedSuccess', 'Application details updated successfully.'));
      setEditModalOpen(false);
      await loadDetail({ showLoading: false });
      notifyApplicationUpdated(applicationType);
    } catch (saveErr) {
      toast.error(saveErr instanceof Error ? saveErr.message : tAdmin('failedToUpdateDetails', 'Failed to update application details'));
    } finally {
      setEditSaving(false);
    }
  };

  const notifyApplicationUpdated = (updatedType: 'membership' | 'loan') => {
    const payload = { applicationType: updatedType, timestamp: Date.now() };
    window.dispatchEvent(new CustomEvent('admin:application-updated', { detail: payload }));
    window.localStorage.setItem('admin:application-updated', JSON.stringify(payload));
  };

  const fetchDetailById = async (resolvedId: string) =>
    adminFetch<{ applicationType: string; application: DetailPayload }>(`/api/${applicationType === 'loan' ? 'loans' : 'membership'}/${resolvedId}`);

  const resolveIdByReference = async (referenceNo: string): Promise<string | null> => {
    const endpoint = applicationType === 'loan' ? '/api/loans' : '/api/membership';
    try {
      const searchResult = await adminFetch<QueueLookupResponse>(`${endpoint}?search=${encodeURIComponent(referenceNo)}&limit=1`);
      const match = searchResult.applications.find((app) => app.referenceNo === referenceNo || app.id === referenceNo);
      if (match) {
        return match.id;
      }
    } catch {
      // Fallback if search fails
    }
    return null;
  };

  const loadDetail = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    if (!id) {
      setError(tAdmin('missingApplicationId', 'Missing application id'));
      if (showLoading) {
        setLoading(false);
      }
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const detail = await fetchDetailById(id);

      if (!detail?.application) {
        throw new Error(tAdmin('applicationNotFound', 'Application not found.'));
      }

      setApplication(detail.application);
      setResolvedApplicationId(id);
    } catch (loadError) {
      // Queue links may carry referenceNo (e.g., ZM-2026-xxxx) while detail API expects DB id.
      if (loadError instanceof AdminApiError && loadError.status === 404) {
        try {
          const resolvedId = await resolveIdByReference(id);
          if (resolvedId) {
            const detail = await fetchDetailById(resolvedId);
            setApplication(detail.application);
            setResolvedApplicationId(resolvedId);
            return;
          }
        } catch {
          // Fall through to unified error handling below.
        }
      }

      setError(loadError instanceof Error ? loadError.message : tAdmin('failedToLoadApplicationDetail', 'Failed to load application detail'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationType, id]);

  const applicantName = useMemo(() => {
    if (!application || !application.applicant) {
      return '';
    }
    const middle = application.applicant.fathersName;
    const last = application.applicant.grandfathersName;
    return [application.applicant.firstName, middle, last].filter((part) => Boolean(part && String(part).trim())).join(' ');
  }, [application]);

  const categoryFields = useMemo(() => {
    if (!application) {
      return [] as Array<{ label: string; value: string | number | boolean | null | undefined }>;
    }

    const membershipFields: Array<{ label: string; value: string | number | boolean | null | undefined }> = [
      { label: tAdmin('branchLabel', 'Preferred Branch'), value: application.branch?.name },
      { label: tAdmin('membershipPaymentAmountLabel', 'Membership Payment Amount'), value: application.membershipPaymentAmount },
      { label: tAdmin('membershipTransactionRefLabel', 'Membership Payment Ref'), value: application.membershipTransactionRef },
      { label: tAdmin('savingTypeLabel', 'Saving Type'), value: application.savingType },
      { label: tAdmin('savingPaymentAmountLabel', 'Saving Payment Amount'), value: application.savingPaymentAmount },
      { label: tAdmin('savingTransactionRefLabel', 'Saving Transaction Ref'), value: application.savingTransactionRef },
      { label: tAdmin('termsAcceptedStatusLabel', 'Terms Accepted'), value: application.termsAccepted },
    ];

    const loanFields: Array<{ label: string; value: string | number | boolean | null | undefined }> = [
      { label: tAdmin('membershipNumberLabel', 'Membership Number'), value: application.membershipNo },
      { label: tAdmin('phoneLabel', 'Phone Number'), value: application.applicant?.phone },
      { label: tAdmin('idTypeLabel', 'ID Type'), value: application.idType },
      { label: tAdmin('maritalStatusLabel', 'Marital Status'), value: application.maritalStatus },
      { label: tAdmin('loanTypeLabel', 'Loan Type'), value: application.loanType },
      { label: tAdmin('branchLabel', 'Preferred Branch'), value: application.branch?.name },
      { label: tAdmin('requestedAmountEtbLabel', 'Requested Amount (ETB)'), value: application.amount },
      { label: tAdmin('requestedTenureMonthsLabel', 'Requested Tenure (Months)'), value: application.tenure },
      { label: tAdmin('collateralTypeLabel', 'Collateral Type'), value: application.collateralType },
      { label: tAdmin('collateralDescriptionLabel', 'Collateral Description'), value: application.collateralDesc },
      { label: tAdmin('termsAcceptedStatusLabel', 'Terms Accepted'), value: application.termsAccepted },
    ];

    return applicationType === 'loan' ? loanFields : membershipFields;
  }, [application, applicationType, tAdmin]);

  const formatFieldValue = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) {
      return tAdmin('na', 'N/A');
    }
    if (typeof value === 'string' && value.trim().length === 0) {
      return tAdmin('na', 'N/A');
    }
    if (typeof value === 'boolean') {
      return value ? tAdmin('yes', 'Yes') : tAdmin('no', 'No');
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return value;
  };

  const updateStatus = async (status: string, note?: string) => {
    if (!resolvedApplicationId || !application?.updatedAt) {
      setError(tAdmin('applicationStateStale', 'Application state is stale. Refresh and try again.'));
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await adminFetch(`/api/${applicationType === 'loan' ? 'loans' : 'membership'}/${resolvedApplicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          note: note || `Status updated to ${status}`,
          expectedUpdatedAt: application.updatedAt,
        }),
      });
      await loadDetail({ showLoading: false });
      notifyApplicationUpdated(applicationType);
      toast.success(`Application ${labelizeStatus(status).toLowerCase()} successfully.`);
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : tAdmin('failedToUpdateStatus', 'Failed to update status');
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const approveApplication = async () => {
    if (!application || !resolvedApplicationId || !application.updatedAt) {
      return;
    }

    if (application.status === 'APPROVED' || application.status === 'ACTIVATED') {
      const message = tAdmin('applicationAlreadyApproved', 'This application is already approved.');
      setError(message);
      toast.info(message);
      return;
    }

    const hasUnverifiedDocuments = application.documents.some((document) => document.status !== 'VERIFIED');
    if (hasUnverifiedDocuments) {
      const message = tAdmin('approveBlockedVerifyDocuments', 'Approve is blocked: verify all uploaded documents first.');
      setError(message);
      toast.error(message);
      return;
    }

    const transitionPath = findStatusPath(application.status, 'APPROVED');
    if (!transitionPath) {
      const message = tAdmin('cannotTransitionFromTo', 'Cannot transition from {{from}} to {{to}}.', { from: application.status, to: 'APPROVED' });
      setError(message);
      toast.error(message);
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      let expectedUpdatedAt = application.updatedAt;
      for (const nextStatus of transitionPath) {
        const response = await adminFetch<{ application: DetailPayload }>(`/api/${applicationType === 'loan' ? 'loans' : 'membership'}/${resolvedApplicationId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: nextStatus,
            note: `Status updated to ${nextStatus}`,
            expectedUpdatedAt,
          }),
        });
        expectedUpdatedAt = response.application.updatedAt;
      }
      await loadDetail({ showLoading: false });
      notifyApplicationUpdated(applicationType);
      toast.success(
        tAdmin('applicationApprovedType', '{{type}} application approved.', {
          type: applicationType === 'loan' ? tAdmin('loan', 'Loan') : tAdmin('membership', 'Membership'),
        })
      );
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : tAdmin('failedToApproveApplication', 'Failed to approve application');
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resolvedApplicationId || !noteInput.trim()) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await adminFetch(`/api/${applicationType === 'loan' ? 'loans' : 'membership'}/${resolvedApplicationId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: noteInput.trim(), isInternal: true }),
      });
      setNoteInput('');
      await loadDetail({ showLoading: false });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tAdmin('failedToSaveNote', 'Failed to save note'));
    } finally {
      setActionLoading(false);
    }
  };

  const updateDocumentStatus = async (documentId: string, action: 'verified' | 'rejected', reason?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      if (action === 'verified') {
        await adminFetch(`/api/${applicationType === 'loan' ? 'loans' : 'membership'}/${resolvedApplicationId}/documents/${documentId}/verify`, { 
          method: 'PATCH',
          body: JSON.stringify({ status: 'VERIFIED' })
        });
        toast.success(tAdmin('documentVerifiedSuccess', 'Document verified successfully.'));
      } else {
        const rejectionReason = reason?.trim() || tAdmin('rejectedByReviewer', 'Rejected by reviewer');
        await adminFetch(`/api/${applicationType === 'loan' ? 'loans' : 'membership'}/${resolvedApplicationId}/documents/${documentId}/verify`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REJECTED', rejectionReason }),
        });
        toast.success(tAdmin('documentRejectedSuccess', 'Document status updated to rejected.'));
      }

      await loadDetail({ showLoading: false });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tAdmin('failedToUpdateDocumentStatus', 'Failed to update document status'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <p className="rounded-lg bg-white p-4 text-sm text-slate-600">{tAdmin('loadingApplicationDetail', 'Loading application detail...')}</p>;
  }

  if (error && !application) {
    return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  }

  if (!application) {
    return <p className="rounded-lg bg-white p-4 text-sm text-slate-600">{tAdmin('applicationNotFound', 'Application not found.')}</p>;
  }

  const getDocumentUrl = (storedName: string) => {
    const cleanPath = storedName.startsWith('/') ? storedName : `/uploads/${storedName}`;
    return `${baseUrl}${cleanPath}`;
  };

  const openDocument = (storedName: string) => {
    window.open(getDocumentUrl(storedName), '_blank', 'noopener,noreferrer');
  };

  const downloadDocument = (storedName: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = getDocumentUrl(storedName);
    link.download = originalName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const applicantInitials = applicantName
    ? applicantName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'AP';

  const isActionable = application.status !== 'APPROVED' && application.status !== 'REJECTED';

  return (
    <section className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Back Navigation Pill */}
      <div>
        <Link
          to={backToQueue}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100/80 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-sm transition-all duration-200 hover:-translate-x-0.5"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
          <span>{tAdmin('backToQueue', 'Back to Queue')}</span>
        </Link>
      </div>

      {/* Hero Card Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 shadow-2xl border border-slate-800">
        {/* Ambient Glow Effects */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-700/60">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Applicant Avatar Pill */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-lg shadow-indigo-500/30 shrink-0 ring-4 ring-white/10">
              {applicantInitials}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{applicantName}</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {labelizeStatus(application.status)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 font-medium">
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-indigo-200 border border-white/10">{application.referenceNo}</span>
                <span>•</span>
                <span className="capitalize">{applicationType === 'loan' ? tAdmin('loan', 'Loan') : tAdmin('membership', 'Membership')} {tAdmin('application', 'Application')}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons (Only shown when actionable) */}
          {isActionable && (canApprove || canWrite) && (
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-100 border border-white/20 font-bold text-sm backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  onClick={handleOpenEditModal}
                >
                  <Pencil className="h-4 w-4 text-indigo-300" />
                  <span>{tAdmin('editDetails', 'Edit Details')}</span>
                </Button>
              )}

              {canApprove && (
                <>
                  <ContextHelp
                    title={tAdmin('approvalRejectionGuidance', 'Approval and Rejection Guidance')}
                    detail={tAdmin('approvalRejectionGuidanceDetail', 'Approve only after verifying all mandatory KYC docs and workflow checks. Reject with explicit, policy-aligned reasoning.')}
                  />
                  <Button
                    size="sm"
                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 border-0"
                    onClick={approveApplication}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{tAdmin('approve', 'Approve Application')}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-bold text-sm backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    onClick={() => {
                      setRejectAppReason('');
                      setRejectAppModalOpen(true);
                    }}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4" />
                    <span>{tAdmin('reject', 'Reject Application')}</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/20 border border-rose-500/30 p-3 text-xs sm:text-sm text-rose-200 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Stats Banner inside Header */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-xs text-slate-300">
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{tAdmin('phone', 'Phone')}</p>
              <p className="font-semibold text-slate-100 truncate">{application.applicant?.phone || tAdmin('na', 'N/A')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{tAdmin('email', 'Email')}</p>
              <p className="font-semibold text-slate-100 truncate">{application.applicant?.email || tAdmin('na', 'N/A')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{tAdmin('branch', 'Branch')}</p>
              <p className="font-semibold text-slate-100 truncate">{application.branch?.name || tAdmin('na', 'N/A')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{tAdmin('submitted', 'Submitted')}</p>
              <p className="font-semibold text-slate-100 truncate">{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : tAdmin('na', 'N/A')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Section */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTabKey)} className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl gap-1.5 inline-flex border border-slate-200/80 shadow-inner max-w-full overflow-x-auto">
          <TabsTrigger
            value="application"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10"
          >
            <FileText className="h-4 w-4" />
            <span>{tAdmin('application', 'Application Overview')}</span>
          </TabsTrigger>

          <TabsTrigger
            value="documents"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10"
          >
            <FileText className="h-4 w-4" />
            <span>{tAdmin('documents', 'Documents')}</span>
            <span className="ml-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
              {application.documents?.length || 0}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="notes"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{tAdmin('notes', 'Internal Notes')}</span>
            <span className="ml-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
              {application.notes?.length || 0}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="timeline"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10"
          >
            <Clock className="h-4 w-4" />
            <span>{tAdmin('timeline', 'Workflow Audit')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Application Overview */}
        <TabsContent value="application" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Applicant Information Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Mail className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">{tAdmin('applicantInformation', 'Applicant Profile')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tAdmin('applicant', 'Full Name')}</p>
                  <p className="text-slate-900 font-bold text-sm">{applicantName}</p>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tAdmin('phone', 'Phone Number')}</p>
                  <p className="text-slate-900 font-semibold">{application.applicant?.phone || tAdmin('na', 'N/A')}</p>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tAdmin('email', 'Email Address')}</p>
                  <p className="text-slate-900 font-semibold truncate">{application.applicant?.email || tAdmin('na', 'N/A')}</p>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tAdmin('idNumber', 'National ID Number')}</p>
                  <p className="text-slate-900 font-mono font-semibold">{application.applicant?.idNumber || tAdmin('na', 'N/A')}</p>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 sm:col-span-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tAdmin('applicationType', 'Category & Type')}</p>
                  <p className="text-indigo-600 font-extrabold capitalize">{applicationType === 'loan' ? tAdmin('loan', 'Loan Application') : tAdmin('membership', 'Membership Application')}</p>
                </div>
              </div>
            </div>

            {/* Application Specific Details Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">{tAdmin('applicationDetails', 'Application Parameters')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                {categoryFields.map((field) => (
                  <div key={field.label} className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{field.label}</p>
                    <p className="text-slate-900 font-bold text-sm">{formatFieldValue(field.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Documents */}
        <TabsContent value="documents" className="pt-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                {tAdmin('documentsSubmitted', 'Uploaded Documents Review')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{tAdmin('reviewDocumentsFromHere', 'Review, view original uploads, and verify or reject individual files directly.')}</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/70 shadow-sm">
              <table className="w-full text-left whitespace-nowrap text-xs sm:text-sm">
                <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">{tAdmin('documentType', 'Document Category')}</th>
                    <th className="px-5 py-3.5">{tAdmin('file', 'File Name')}</th>
                    <th className="px-5 py-3.5">{tAdmin('uploaded', 'Upload Date')}</th>
                    <th className="px-5 py-3.5">{tAdmin('status', 'Verification Status')}</th>
                    <th className="px-5 py-3.5 text-center">{tAdmin('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                  {(!application.documents || application.documents.length === 0) && (
                    <tr>
                      <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                        {tAdmin('noDocumentsUploadedYet', 'No documents uploaded yet.')}
                      </td>
                    </tr>
                  )}
                  {(application.documents || []).map((document) => (
                    <tr key={document.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">{labelizeStatus(document.category)}</td>
                      <td className="px-5 py-4 text-slate-600 max-w-[200px] truncate">{document.originalName}</td>
                      <td className="px-5 py-4 text-slate-500">{new Date(document.uploadedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${documentStatusColors[document.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {labelizeStatus(document.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={tAdmin('view', 'View Document')}
                            className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
                            onClick={() => openDocument(document.storedName)}
                          >
                            <Eye className="h-4 w-4 mr-1 text-indigo-600" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={tAdmin('download', 'Download')}
                            className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
                            onClick={() => downloadDocument(document.storedName, document.originalName)}
                          >
                            <Download className="h-4 w-4 mr-1 text-slate-600" /> Save
                          </Button>
                          {canVerifyDocs && isActionable && (
                            <>
                              <Button
                                size="sm"
                                className={
                                  document.status === 'VERIFIED'
                                    ? 'h-8 px-3 bg-emerald-600 text-white font-bold text-xs shadow-sm cursor-default'
                                    : 'h-8 px-3 border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs shadow-sm transition-all'
                                }
                                disabled={actionLoading}
                                onClick={() => {
                                  if (document.status !== 'VERIFIED') {
                                    void updateDocumentStatus(document.id, 'verified');
                                  }
                                }}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {document.status === 'VERIFIED' ? tAdmin('verified', 'Verified') : tAdmin('verify', 'Verify')}
                              </Button>

                              <Button
                                size="sm"
                                className={
                                  document.status === 'REJECTED'
                                    ? 'h-8 px-3 bg-rose-600 text-white font-bold text-xs shadow-sm cursor-default'
                                    : 'h-8 px-3 border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs shadow-sm transition-all'
                                }
                                disabled={actionLoading}
                                onClick={() => {
                                  if (document.status !== 'REJECTED') {
                                    setRejectDocReason('');
                                    setRejectDocTarget(document);
                                  }
                                }}
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" /> {document.status === 'REJECTED' ? tAdmin('rejected', 'Rejected') : tAdmin('reject', 'Reject')}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Internal Notes */}
        <TabsContent value="notes" className="space-y-6 pt-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              {tAdmin('addInternalNote', 'Internal Reviewer Notes')}
            </h3>

            <form className="space-y-3" onSubmit={addNote}>
              <Textarea
                placeholder={tAdmin('writeInternalNote', 'Write a clear internal note for officers or managers...')}
                value={noteInput}
                onChange={(event) => setNoteInput(event.target.value)}
                className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-2xl p-4 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  type="submit"
                  disabled={actionLoading || !noteInput.trim()}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200"
                >
                  {tAdmin('addNote', 'Post Note')}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {(!application.notes || application.notes.length === 0) && (
              <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-500 border border-slate-200/80">
                {tAdmin('noNotesYet', 'No internal notes posted yet.')}
              </div>
            )}
            {(application.notes || []).map((note) => (
              <div key={note.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:border-slate-300 transition-colors space-y-3">
                <p className="text-slate-800 text-sm leading-relaxed font-medium">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{note.author.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase">
                      {note.author.role}
                    </span>
                  </div>
                  <span className="text-slate-400 font-medium">{new Date(note.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: Workflow Audit Timeline */}
        <TabsContent value="timeline" className="pt-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <h3 className="text-base font-extrabold text-slate-900 mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              {tAdmin('timeline', 'Workflow Audit History')}
            </h3>

            <div className="space-y-0 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {(!application.workflow || application.workflow.length === 0) && (
                <p className="text-sm text-slate-500">{tAdmin('noWorkflowActionsYet', 'No workflow events logged yet.')}</p>
              )}
              {(application.workflow || []).map((item, i) => (
                <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0 pl-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30 z-10 ring-4 ring-white">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 flex-1 space-y-1.5">
                    <p className="text-sm font-extrabold text-slate-900">
                      {labelizeStatus(item.fromStatus)} <span className="text-indigo-600 font-bold px-1">→</span> {labelizeStatus(item.toStatus)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="font-bold text-slate-800">{item.changedBy.name}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    {item.note && <p className="mt-2 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/70 font-medium">{item.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal for Application Rejection */}
      <AlertDialog open={rejectAppModalOpen} onOpenChange={setRejectAppModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              {tAdmin('confirmRejectAppTitle', 'Confirm Application Rejection')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {tAdmin('confirmRejectAppDesc', 'Are you sure you want to reject application {{ref}} for {{name}}? This action will set the application status to REJECTED.', {
                ref: application?.referenceNo || '',
                name: applicantName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              {tAdmin('rejectionReasonLabel', 'Reason for Rejection (Optional)')}
            </label>
            <Textarea
              placeholder={tAdmin('rejectionReasonPlaceholder', 'Provide policy or documentation reason...')}
              value={rejectAppReason}
              onChange={(e) => setRejectAppReason(e.target.value)}
              className="text-sm border-slate-300"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>{tAdmin('cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
              disabled={actionLoading}
              onClick={() => {
                void updateStatus('REJECTED', rejectAppReason.trim() || undefined);
                setRejectAppModalOpen(false);
              }}
            >
              {tAdmin('confirmRejectAppBtn', 'Confirm Rejection')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Modal for Document Rejection */}
      <AlertDialog open={Boolean(rejectDocTarget)} onOpenChange={(open) => { if (!open) setRejectDocTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              {tAdmin('confirmRejectDocTitle', 'Confirm Document Rejection')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              {tAdmin('confirmRejectDocDesc', 'Are you sure you want to reject the {{type}} document "{{file}}"?', {
                type: rejectDocTarget ? labelizeStatus(rejectDocTarget.category) : '',
                file: rejectDocTarget?.originalName || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              {tAdmin('docRejectionReasonLabel', 'Reason for Document Rejection')}
            </label>
            <Input
              placeholder={tAdmin('docRejectionReasonPlaceholder', 'e.g. Document unreadable or expired')}
              value={rejectDocReason}
              onChange={(e) => setRejectDocReason(e.target.value)}
              className="text-sm border-slate-300"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>{tAdmin('cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
              disabled={actionLoading}
              onClick={() => {
                if (rejectDocTarget) {
                  void updateDocumentStatus(rejectDocTarget.id, 'rejected', rejectDocReason);
                  setRejectDocTarget(null);
                }
              }}
            >
              {tAdmin('confirmRejectDocBtn', 'Reject Document')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Details Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-extrabold">
              <Pencil className="h-5 w-5 text-indigo-600" />
              {tAdmin('editApplicationDetailsTitle', 'Edit Application Parameters')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('firstName', 'First Name')}</label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('fathersName', 'Father\'s Name')}</label>
                <Input
                  value={editForm.fathersName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fathersName: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('grandfathersName', 'Grandfather\'s Name')}</label>
                <Input
                  value={editForm.grandfathersName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, grandfathersName: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('phone', 'Phone Number')}</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('email', 'Email Address')}</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="text-sm"
                />
              </div>

              {applicationType === 'loan' ? (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('requestedAmountEtbLabel', 'Loan Amount (ETB)')}</label>
                  <Input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('membershipPaymentAmountLabel', 'Membership Payment Amount')}</label>
                    <Input
                      type="number"
                      value={editForm.membershipPaymentAmount}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, membershipPaymentAmount: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('membershipTransactionRefLabel', 'Membership Transaction Ref')}</label>
                    <Input
                      value={editForm.membershipTransactionRef}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, membershipTransactionRef: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('savingTypeLabel', 'Saving Type')}</label>
                    <Input
                      value={editForm.savingType}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, savingType: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('savingPaymentAmountLabel', 'Saving Payment (ETB)')}</label>
                    <Input
                      type="number"
                      value={editForm.savingPaymentAmount}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, savingPaymentAmount: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">{tAdmin('savingTransactionRefLabel', 'Transaction Ref')}</label>
                    <Input
                      value={editForm.savingTransactionRef}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, savingTransactionRef: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)} disabled={editSaving}>
              {tAdmin('cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              disabled={editSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={handleSaveEditDetails}
            >
              {editSaving ? tAdmin('saving', 'Saving...') : tAdmin('saveChanges', 'Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
