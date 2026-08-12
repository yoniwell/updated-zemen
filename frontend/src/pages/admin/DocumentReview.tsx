import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Download, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { adminFetch } from '@/lib/adminApi';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminI18n } from '@/lib/uiI18n';

import { Select,SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const baseUrl = getApiBaseUrl();

type DocumentItem = {
  id: string;
  category: string;
  originalName: string;
  storedName: string;
  status: string;
  uploadedAt: string;
  verifiedBy?: {
    name: string;
  } | null;
  membershipApplication?: {
    id: string;
    referenceNo: string;
    applicant: {
      firstName: string;
      fathersName?: string | null;
      grandfathersName: string;
    };
  } | null;
  loanApplication?: {
    id: string;
    referenceNo: string;
    applicant: {
      firstName: string;
      fathersName?: string | null;
      grandfathersName: string;
    };
  } | null;
};

type DocumentReviewResponse = {
  documents: DocumentItem[];
};

const categoryLabel = (category: string) =>
  category
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const applicantName = (document: DocumentItem) => {
  const applicant = document.membershipApplication?.applicant || document.loanApplication?.applicant;
  if (!applicant) return '-';
  return [applicant.firstName, applicant.fathersName || null, applicant.grandfathersName || null].filter((part) => Boolean(part && part.trim())).join(' ');
};

const referenceNo = (document: DocumentItem) => document.membershipApplication?.referenceNo || document.loanApplication?.referenceNo || '-';

export default function DocumentReview() {
  const { tAdmin } = useAdminI18n();
  const [statusFilter, setStatusFilter] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (docTypeFilter !== 'all') params.set('category', docTypeFilter);

      const response = await adminFetch<DocumentReviewResponse>(`/api/applications/documents/review?${params.toString()}`);
      setDocuments(response.documents);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tAdmin('failedLoadDocuments', 'Failed to load documents'));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, docTypeFilter]);

  const filtered = useMemo(() => documents.filter((d) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const docApplicant = applicantName(d).toLowerCase();
    return referenceNo(d).toLowerCase().includes(term) || docApplicant.includes(term) || categoryLabel(d.category).toLowerCase().includes(term);
  }), [documents, search]);

  const documentTypeOptions = useMemo(() => {
    const types = new Set(documents.map((document) => document.category));
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map((d) => d.id));
  };

  const runBulkStatus = async (status: 'VERIFIED' | 'REJECTED') => {
    if (selected.length === 0) return;

    let reason: string | undefined;
    if (status === 'REJECTED') {
      const prompted = window.prompt(tAdmin('enterRejectionReason', 'Enter rejection reason'));
      if (!prompted || !prompted.trim()) {
        toast.error(tAdmin('rejectionReasonRequired', 'Rejection reason is required'));
        return;
      }
      reason = prompted.trim();
    }

    setActionLoading(true);
    try {
      await adminFetch('/api/applications/documents/bulk-status', {
        method: 'PATCH',
        body: JSON.stringify({ documentIds: selected, status, reason }),
      });
      setSelected([]);
      await loadDocuments();
      toast.success(status === 'VERIFIED' ? tAdmin('documentsVerified', 'Documents verified') : tAdmin('documentsRejected', 'Documents rejected'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tAdmin('failedUpdateDocuments', 'Failed to update documents'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <p className="rounded-lg bg-white p-4 text-sm text-slate-600">{tAdmin('loadingDocuments', 'Loading documents...')}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
        </div>
        <div className="flex items-center gap-2">
        {selected.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => runBulkStatus('VERIFIED')} disabled={actionLoading}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> {tAdmin('approveSelected', 'Approve ({{count}})', { count: selected.length })}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => runBulkStatus('REJECTED')} disabled={actionLoading}>
              <XCircle className="mr-1 h-4 w-4" /> {tAdmin('rejectSelected', 'Reject ({{count}})', { count: selected.length })}
            </Button>
          </div>
        )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl bg-white p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder={tAdmin('searchByApplicantOrReference', 'Search by applicant or reference...')} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={tAdmin('status', 'Status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAdmin('allStatuses', 'All Statuses')}</SelectItem>
            <SelectItem value="PENDING">{tAdmin('pending', 'Pending')}</SelectItem>
            <SelectItem value="VERIFIED">{tAdmin('verified', 'Verified')}</SelectItem>
            <SelectItem value="REJECTED">{tAdmin('rejected', 'Rejected')}</SelectItem>
            <SelectItem value="FLAGGED">{tAdmin('flagged', 'Flagged')}</SelectItem>
            <SelectItem value="EXPIRED">{tAdmin('expired', 'Expired')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={tAdmin('documentType', 'Document Type')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAdmin('allTypes', 'All Types')}</SelectItem>
            {documentTypeOptions.map((category) => (
              <SelectItem key={category} value={category}>{categoryLabel(category)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full table-auto text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal [&_td]:break-words">
          <thead>
            <tr className="border-b">
              <th className="w-10 p-2"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
              <th className="p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('reference', 'Reference')}</th>
              <th className="p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('applicant', 'Applicant')}</th>
              <th className="p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('documentType', 'Document Type')}</th>
              <th className="p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('uploaded', 'Uploaded')}</th>
              <th className="p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('status', 'Status')}</th>
              <th className="p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('reviewer', 'Reviewer')}</th>
              <th className="p-2 text-left text-[10px] font-medium text-muted-foreground">{tAdmin('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                <td className="p-2"><Checkbox checked={selected.includes(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} /></td>
                <td className="p-2 text-xs font-medium text-primary">{referenceNo(doc)}</td>
                <td className="p-2 text-xs text-foreground">{applicantName(doc)}</td>
                <td className="p-2 text-xs text-muted-foreground">{categoryLabel(doc.category)}</td>
                <td className="p-2 text-xs text-muted-foreground">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                <td className="p-2"><StatusBadge status={doc.status} /></td>
                <td className="p-2 text-xs text-muted-foreground">{doc.verifiedBy?.name || '-'}</td>
                <td className="flex gap-1 p-2">
                  <Button variant="ghost" size="sm" onClick={() => window.open(`${baseUrl}/uploads/${doc.storedName}`, '_blank')}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`${baseUrl}/uploads/${doc.storedName}`, '_blank')}><Download className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
