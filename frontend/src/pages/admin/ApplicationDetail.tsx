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
  Phone,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { AdminApiError, adminFetch } from '@/lib/adminApi';

import { toast } from 'sonner';
import ContextHelp from '@/components/admin/ContextHelp';
import { useAdminI18n } from '@/lib/uiI18n';
import { Link, useParams } from 'react-router-dom';
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
    middleName?: string | null;
    lastName?: string | null;
    phone: string;
    email?: string | null;
    idNumber?: string | null;
  };
  branch?: {
    id: string;
    name: string;
  } | null;
  occupation?: string | null;
  employer?: string | null;
  applicantType?: string | null;
  incomeRange?: string | null;
  membershipProduct?: string | null;
  membershipPaymentAmount?: number | null;
  savingType?: string | null;
  savingPaymentAmount?: number | null;
  savingTransactionRef?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  termsAccepted?: boolean | null;
  privacyAccepted?: boolean | null;
  signature?: string | null;
  membershipNo?: string | null;
  registeredMobile?: string | null;
  idType?: string | null;
  maritalStatus?: string | null;
  amount?: number | null;
  loanType?: string | null;
  tenure?: number | null;
  purpose?: string | null;
  repaymentSource?: string | null;
  monthlyIncome?: number | null;
  monthlyExpenses?: number | null;
  existingLoans?: number | null;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
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
  UNDER_REVIEW: 'bg-info/10 text-info',
  KYC_VERIFICATION: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  PENDING_CLARIFICATION: 'bg-warning/10 text-warning',
  SUBMITTED: 'bg-primary/10 text-primary',
  REJECTED: 'bg-accent/10 text-accent',
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_DOCUMENTS: 'bg-warning/10 text-warning',
};

const documentStatusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  VERIFIED: 'bg-success/10 text-success',
  REJECTED: 'bg-accent/10 text-accent',
  FLAGGED: 'bg-info/10 text-info',
  EXPIRED: 'bg-muted text-muted-foreground',
};

const statusTransitionMap: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'PENDING_DOCUMENTS', 'REJECTED'],
  UNDER_REVIEW: ['KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED'],
  KYC_VERIFICATION: ['UNDER_REVIEW', 'PENDING_DOCUMENTS', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED'],
  PENDING_DOCUMENTS: ['UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_CLARIFICATION', 'REJECTED'],
  PENDING_CLARIFICATION: ['UNDER_REVIEW', 'KYC_VERIFICATION', 'PENDING_DOCUMENTS', 'REJECTED'],
  APPROVED: ['ACTIVATED'],
  REJECTED: [],
  ACTIVATED: [],
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
  const [application, setApplication] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTabKey>('application');
  const [error, setError] = useState<string | null>(null);
  const [resolvedApplicationId, setResolvedApplicationId] = useState<string>('');
  const [noteInput, setNoteInput] = useState('');
  const [, setActiveAction] = useState<'approve' | 'reject' | null>(null);
  const applicationType = type === 'loan' ? 'loan' : 'membership';
  const backToQueue = applicationType === 'loan' ? '/admin/loan-queue' : '/admin/membership-queue';

  const notifyApplicationUpdated = (updatedType: 'membership' | 'loan') => {
    const payload = { applicationType: updatedType, timestamp: Date.now() };
    window.dispatchEvent(new CustomEvent('admin:application-updated', { detail: payload }));
    window.localStorage.setItem('admin:application-updated', JSON.stringify(payload));
  };

  const fetchDetailById = async (resolvedId: string) =>
    adminFetch<{ applicationType: string; application: DetailPayload }>(`/api/admin/applications/${applicationType}/${resolvedId}`);

  const resolveIdByReference = async (referenceNo: string): Promise<string | null> => {
    const endpoint = applicationType === 'loan' ? '/api/admin/queues/loan' : '/api/admin/queues/membership';
    const pageSize = 100;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page += 1) {
      const queue = await adminFetch<QueueLookupResponse>(`${endpoint}?page=${page}&limit=${pageSize}`);
      const match = queue.applications.find((app) => app.referenceNo === referenceNo);
      if (match) {
        return match.id;
      }

      if (page * pageSize >= queue.total) {
        break;
      }
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
    if (!application) {
      return '';
    }
    const middle = application.applicant.middleName;
    const last = application.applicant.lastName;
    return [application.applicant.firstName, middle, last].filter((part) => Boolean(part && String(part).trim())).join(' ');
  }, [application]);

  const categoryFields = useMemo(() => {
    if (!application) {
      return [] as Array<{ label: string; value: string | number | boolean | null | undefined }>;
    }

    const membershipFields: Array<{ label: string; value: string | number | boolean | null | undefined }> = [
      { label: tAdmin('branchLabel', 'Preferred Branch'), value: application.branch?.name },
      { label: tAdmin('membershipPaymentAmountLabel', 'Membership Payment Amount'), value: application.membershipPaymentAmount },
      { label: tAdmin('savingTypeLabel', 'Saving Type'), value: application.savingType },
      { label: tAdmin('savingPaymentAmountLabel', 'Saving Payment Amount'), value: application.savingPaymentAmount },
      { label: tAdmin('savingTransactionRefLabel', 'Saving Transaction Ref'), value: application.savingTransactionRef },
      { label: tAdmin('termsAcceptedStatusLabel', 'Terms Accepted'), value: application.termsAccepted },
    ];

    const loanFields: Array<{ label: string; value: string | number | boolean | null | undefined }> = [
      { label: tAdmin('membershipNumberLabel', 'Membership Number'), value: application.membershipNo },
      { label: tAdmin('registeredMobileLabel', 'Registered Mobile'), value: application.registeredMobile },
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

  const updateStatus = async (status: string) => {
    if (!resolvedApplicationId || !application?.updatedAt) {
      setError(tAdmin('applicationStateStale', 'Application state is stale. Refresh and try again.'));
      return;
    }
    setActiveAction(status === 'REJECTED' ? 'reject' : null);
    setActionLoading(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/applications/${applicationType}/${resolvedApplicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          note: `Status updated to ${status}`,
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

    setActiveAction('approve');
    setActionLoading(true);
    setError(null);
    try {
      let expectedUpdatedAt = application.updatedAt;
      for (const nextStatus of transitionPath) {
        const response = await adminFetch<{ application: DetailPayload }>(`/api/admin/applications/${applicationType}/${resolvedApplicationId}/status`, {
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
      await adminFetch(`/api/admin/applications/${applicationType}/${resolvedApplicationId}/notes`, {
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

  const updateDocumentStatus = async (documentId: string, action: 'verified' | 'rejected') => {
    setActionLoading(true);
    setError(null);
    try {
      if (action === 'verified') {
        await adminFetch(`/api/admin/documents/${documentId}/verify`, { method: 'PATCH' });
      } else {
        const prompted = window.prompt(tAdmin('reasonForRejection', 'Reason for rejection'), tAdmin('rejectedByReviewer', 'Rejected by reviewer'));
        const reason = prompted?.trim();
        if (!reason) {
          setActionLoading(false);
          return;
        }
        await adminFetch(`/api/admin/documents/${documentId}/reject`, {
          method: 'PATCH',
          body: JSON.stringify({ reason }),
        });
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

  const openDocument = (storedName: string) => {
    window.open(`${baseUrl}/uploads/${storedName}`, '_blank', 'noopener,noreferrer');
  };

  const downloadDocument = (storedName: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = `${baseUrl}/uploads/${storedName}`;
    link.download = originalName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="font-serif">
      <Link to={backToQueue} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {tAdmin('backToQueue', 'Back to queue')}
      </Link>

      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <h1 className="font-serif text-2xl font-semibold text-slate-900">{applicantName}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[application.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {labelizeStatus(application.status)}
              </span>
            </div>
            <p className="text-sm text-slate-600">{application.referenceNo} · {applicationType === 'loan' ? tAdmin('loan', 'Loan') : tAdmin('membership', 'Membership')} {tAdmin('application', 'Application')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 border border-slate-200">
              <ContextHelp
                title={tAdmin('approvalRejectionGuidance', 'Approval and Rejection Guidance')}
                detail={tAdmin('approvalRejectionGuidanceDetail', 'Approve only after verifying all mandatory KYC docs and workflow checks. Reject with explicit, policy-aligned reasoning.')}
              />
              <Button
                size="sm"
                className="border-0 bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
                onClick={approveApplication}
                disabled={actionLoading}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> {tAdmin('approve', 'Approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                onClick={() => updateStatus('REJECTED')}
                disabled={actionLoading}
              >
                <XCircle className="mr-2 h-4 w-4" /> {tAdmin('reject', 'Reject')}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">{error}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 sm:grid-cols-4">
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">{tAdmin('phone', 'Phone')}</p>
              <p className="text-sm text-slate-900 truncate">{application.applicant.phone || tAdmin('na', 'N/A')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">{tAdmin('email', 'Email')}</p>
              <p className="text-sm text-slate-900 truncate">{application.applicant.email || tAdmin('na', 'N/A')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">{tAdmin('assignedTo', 'Assigned To')}</p>
              <p className="text-sm text-slate-900">{application.assignedTo?.name || tAdmin('unassigned', 'Unassigned')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">{tAdmin('submitted', 'Submitted')}</p>
              <p className="text-sm text-slate-900">{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : tAdmin('na', 'N/A')}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTabKey)} className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="application"><FileText className="mr-1 h-4 w-4" /> {tAdmin('application', 'Application')}</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="mr-1 h-4 w-4" /> {tAdmin('documents', 'Documents')}</TabsTrigger>
            <TabsTrigger value="notes"><MessageSquare className="mr-1 h-4 w-4" /> {tAdmin('notes', 'Notes')}</TabsTrigger>
            <TabsTrigger value="timeline"><Clock className="mr-1 h-4 w-4" /> {tAdmin('timeline', 'Timeline')}</TabsTrigger>
          </TabsList>

          <TabsContent value="application" className="space-y-4">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="mb-4 font-semibold text-slate-900 text-lg">{tAdmin('applicantInformation', 'Applicant Information')}</h3>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">{tAdmin('applicant', 'Applicant')}</p>
                    <p className="text-slate-900 font-medium">{applicantName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">{tAdmin('phone', 'Phone')}</p>
                    <p className="text-slate-900">{application.applicant.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">{tAdmin('email', 'Email')}</p>
                    <p className="text-slate-900">{application.applicant.email || tAdmin('na', 'N/A')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">{tAdmin('idNumber', 'ID Number')}</p>
                    <p className="text-slate-900">{application.applicant.idNumber || tAdmin('na', 'N/A')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">{tAdmin('applicationType', 'Application Type')}</p>
                    <p className="text-slate-900">{applicationType === 'loan' ? tAdmin('loan', 'Loan') : tAdmin('membership', 'Membership')}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="mb-4 font-semibold text-slate-900 text-lg">{tAdmin('applicationDetails', 'Application Details')}</h3>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  {categoryFields.map((field) => (
                    <div key={field.label}>
                      <p className="text-xs font-medium text-slate-600 mb-1">{field.label}</p>
                      <p className="text-slate-900">{formatFieldValue(field.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

          <TabsContent value="documents">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{tAdmin('documentsSubmitted', 'Documents Submitted')}</h3>
                <p className="text-xs text-slate-600">{tAdmin('reviewDocumentsFromHere', 'Review and approve/reject documents directly from this tab.')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">{tAdmin('documentType', 'Document Type')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">{tAdmin('file', 'File')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">{tAdmin('uploaded', 'Uploaded')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">{tAdmin('status', 'Status')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">{tAdmin('actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {application.documents.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-sm text-slate-600 text-center" colSpan={5}>{tAdmin('noDocumentsUploadedYet', 'No documents uploaded yet.')}</td>
                      </tr>
                    )}
                    {application.documents.map((document) => (
                      <tr key={document.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{labelizeStatus(document.category)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{document.originalName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(document.uploadedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${documentStatusColors[document.status] ?? 'bg-slate-100 text-slate-700'}`}>
                            {labelizeStatus(document.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title={tAdmin('view', 'View')}
                              className="h-8 w-8 p-0 hover:bg-slate-100"
                              onClick={() => openDocument(document.storedName)}
                            >
                              <Eye className="h-4 w-4 text-slate-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              title={tAdmin('download', 'Download')}
                              className="h-8 w-8 p-0 hover:bg-slate-100"
                              onClick={() => downloadDocument(document.storedName, document.originalName)}
                            >
                              <Download className="h-4 w-4 text-slate-600" />
                            </Button>
                            <Button
                              variant={document.status === 'VERIFIED' ? 'default' : 'outline'}
                              size="sm"
                              className={document.status === 'VERIFIED' ? 'h-8 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs' : 'h-8 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-xs'}
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
                              variant={document.status === 'REJECTED' ? 'default' : 'outline'}
                              size="sm"
                              className={document.status === 'REJECTED' ? 'h-8 bg-red-600 text-white hover:bg-red-700 font-bold text-xs' : 'h-8 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 font-medium text-xs'}
                              disabled={actionLoading}
                              onClick={() => {
                                if (document.status !== 'REJECTED') {
                                  void updateDocumentStatus(document.id, 'rejected');
                                }
                              }}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" /> {document.status === 'REJECTED' ? tAdmin('rejected', 'Rejected') : tAdmin('reject', 'Reject')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h3 className="mb-4 font-semibold text-slate-900">{tAdmin('addInternalNote', 'Add Internal Note')}</h3>
              <form className="space-y-3" onSubmit={addNote}>
                <Textarea 
                  placeholder={tAdmin('writeInternalNote', 'Write an internal note...')} 
                  value={noteInput} 
                  onChange={(event) => setNoteInput(event.target.value)}
                  className="border-slate-300"
                />
                <Button size="sm" type="submit" disabled={actionLoading || !noteInput.trim()} className="bg-blue-600 hover:bg-blue-700">{tAdmin('addNote', 'Add Note')}</Button>
              </form>
            </div>

            {application.notes.length === 0 && <p className="text-sm text-slate-600 bg-white rounded-2xl p-4">{tAdmin('noNotesYet', 'No notes yet.')}</p>}
            {application.notes.map((note) => (
              <div key={note.id} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <p className="mb-3 text-sm text-slate-900 leading-relaxed">{note.content}</p>
                <div className="flex items-center gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span className="font-medium text-slate-900">{note.author.name}</span>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="timeline">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="space-y-0">
                {application.workflow.length === 0 && <p className="text-sm text-slate-600">{tAdmin('noWorkflowActionsYet', 'No workflow actions yet.')}</p>}
                {application.workflow.map((item, i) => (
                  <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-blue-600" />
                      {i < application.workflow.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="pb-2 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{labelizeStatus(item.fromStatus)} <span className="text-slate-500">→</span> {labelizeStatus(item.toStatus)}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                        <span className="font-medium">{item.changedBy.name}</span>
                        <span className="text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      {item.note && <p className="mt-2 text-sm text-slate-700 bg-blue-50 p-2 rounded border border-blue-100">{item.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
