import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAdminI18n } from '@/lib/uiI18n';
import { AdminBranch, useAdminBranches } from '@/hooks/useAdminBranches';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/adminApi';
import { toastApiError } from '@/lib/apiToast';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateBranchForm {
  name: string;
  code: string;
  location: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CLOSED';
  managerName?: string;
  officeHours?: string;
  mapUrl?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  published?: boolean;
}

const defaultForm: CreateBranchForm = {
  name: '',
  code: '',
  location: '',
  status: 'OPERATIONAL',
  managerName: '',
  officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
  mapUrl: '',
  phonePrimary: '',
  phoneSecondary: '',
  published: true,
};

export default function BranchManagementComponent() {
  const t = useAdminI18n();
  const { branches, reload } = useAdminBranches();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBranchForm>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deletedBranchIds, setDeletedBranchIds] = useState<string[]>([]);

  const handleCreateBranch = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error(t('adminBranchNameCodeRequired', 'Branch name and code are required'));
      return;
    }
    setIsSubmitting(true);
    try {
      await adminFetch('/api/settings/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          code: createForm.code.trim().toUpperCase(),
          location: createForm.location.trim() || 'Headquarters',
          status: createForm.status,
          manager: createForm.managerName?.trim() || null,
          officeHours: createForm.officeHours?.trim() || null,
          mapUrl: createForm.mapUrl?.trim() || null,
          phonePrimary: createForm.phonePrimary?.trim() || null,
          phoneSecondary: createForm.phoneSecondary?.trim() || null,
          published: createForm.published ?? true,
        }),
      });
      toast.success(t('adminBranchCreatedSuccess', 'Branch created successfully'));
      setCreateForm(defaultForm);
      setIsCreateOpen(false);
      await reload?.();
    } catch (error) {
      toastApiError(error, t('adminBranchCreateFailed', 'Failed to create branch'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleteTargetBranchId, setDeleteTargetBranchId] = useState<string | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  const onRequestDeleteBranch = useCallback((branchId: string) => {
    setDeleteTargetBranchId(branchId);
  }, []);

  const confirmDeleteBranch = useCallback(async () => {
    if (!deleteTargetBranchId) return;
    setIsDeletingBranch(true);
    try {
      await adminFetch(`/api/settings/branches/${String(deleteTargetBranchId).trim()}`, {
        method: 'DELETE',
      });
      toast.success(t('adminBranchDeletedSuccess', 'Branch deleted successfully'));
      setDeletedBranchIds((prev) => [...prev, deleteTargetBranchId]);
      await reload?.();
    } catch (error) {
      toastApiError(error, t('adminBranchDeleteFailed', 'Failed to delete branch'));
    } finally {
      setIsDeletingBranch(false);
      setDeleteTargetBranchId(null);
    }
  }, [deleteTargetBranchId, reload, t]);

  const handleDeleteBranch = onRequestDeleteBranch;

  // Global delete interceptor
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.hasAttribute('data-global-delete-id')) {
        e.preventDefault();
        e.stopPropagation();
        const branchId = target.getAttribute('data-global-delete-id');
        if (branchId) {
          void handleDeleteBranch(branchId);
        }
      }
    };
    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, [branches,handleDeleteBranch]);

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const activeBranches = useMemo(() => {
    return branches.filter((branch) => {
      if (deletedBranchIds.includes(branch.id)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        branch.name?.toLowerCase().includes(q) ||
        branch.code?.toLowerCase().includes(q) ||
        branch.location?.toLowerCase().includes(q)
      );
    });
  }, [branches, deletedBranchIds, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(activeBranches.length / ITEMS_PER_PAGE));
  const paginatedBranches = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return activeBranches.slice(start, start + ITEMS_PER_PAGE);
  }, [activeBranches, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Edit state
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchForm, setEditingBranchForm] = useState({ 
    name: '', code: '', location: '', manager: '', status: 'OPERATIONAL',
    officeHours: '', mapUrl: '', phonePrimary: '', phoneSecondary: '', published: true
  });
  const [savingBranch, setSavingBranch] = useState(false);

  const startEditBranch = (branch: AdminBranch) => {
    setEditingBranchId(branch.id);
    setEditingBranchForm({
      name: branch.name,
      code: branch.code || '',
      location: branch.location || '',
      manager: branch.manager || '',
      status: branch.status || 'OPERATIONAL',
      officeHours: branch.officeHours || '',
      mapUrl: branch.mapUrl || '',
      phonePrimary: branch.phonePrimary || '',
      phoneSecondary: branch.phoneSecondary || '',
      published: branch.published ?? true,
    });
  };

  const closeEditBranchDialog = () => {
    if (savingBranch) return;
    setEditingBranchId(null);
  };
  const saveBranchEdit = async () => {
    if (!editingBranchId) return;
    setSavingBranch(true);
    try {
      await adminFetch<{ branch: unknown }>(`/api/settings/branches/${editingBranchId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingBranchForm.name.trim(),
          code: editingBranchForm.code.trim().toUpperCase(),
          location: editingBranchForm.location.trim(),
          status: editingBranchForm.status,
          manager: editingBranchForm.manager.trim() || null,
          officeHours: editingBranchForm.officeHours.trim() || null,
          mapUrl: editingBranchForm.mapUrl.trim() || null,
          phonePrimary: editingBranchForm.phonePrimary.trim() || null,
          phoneSecondary: editingBranchForm.phoneSecondary.trim() || null,
          published: editingBranchForm.published,
        }),
      });
      toast.success(t('adminBranchUpdated', 'Branch updated successfully'));
      await reload?.();
      closeEditBranchDialog();
    } catch (err: any) {
      toastApiError(err, 'Failed to update branch');
    } finally {
      setSavingBranch(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'OPERATIONAL') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">Operational</span>;
    }
    if (s === 'MAINTENANCE') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Maintenance</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* 1. Header & Primary Action */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('adminBranchManagementTitle', 'Branch Management')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage system branches, operational statuses, and locations</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('addBranch', 'Add Branch')}
        </button>
      </div>

      {/* 2. Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by branch name, code, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm"
          />
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('adminCreateBranch', 'Create Branch')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">{t('branchName', 'Branch Name')} <span className="text-red-500">*</span></label><Input placeholder={t('branchNameExample', 'e.g. Bole Branch')} value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">{t('code', 'Code')} <span className="text-red-500">*</span></label><Input placeholder={t('branchCodeExample', 'e.g. BL-001')} value={createForm.code} onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">{t('location', 'Location')} <span className="text-red-500">*</span></label><Input placeholder={t('locationExample', 'e.g. Addis Ababa')} value={createForm.location} onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))} /></div>
            
            <Select value={createForm.status} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, status: value as 'OPERATIONAL' | 'MAINTENANCE' | 'CLOSED'  }))}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectStatus', 'Select status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATIONAL">{t('operational', 'Operational')}</SelectItem>
                <SelectItem value="MAINTENANCE">{t('maintenance', 'Maintenance')}</SelectItem>
                <SelectItem value="CLOSED">{t('closed', 'Closed')}</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder={t('managerOptionalExample', 'Manager (optional)')} value={createForm.managerName || ''} onChange={(e) => setCreateForm((prev) => ({ ...prev, managerName: e.target.value }))} />
            <Input placeholder={t('officeHoursExample', 'Office Hours (e.g. Mon-Fri 8:30 AM - 5:30 PM)')} value={createForm.officeHours || ''} onChange={(e) => setCreateForm((prev) => ({ ...prev, officeHours: e.target.value }))} />
            <Input placeholder={t('mapUrlExample', 'Google Maps URL')} value={createForm.mapUrl || ''} onChange={(e) => setCreateForm((prev) => ({ ...prev, mapUrl: e.target.value }))} />
            <Input placeholder={t('phonePrimaryExample', 'Primary Phone')} value={createForm.phonePrimary || ''} onChange={(e) => setCreateForm((prev) => ({ ...prev, phonePrimary: e.target.value }))} />
            <Input placeholder={t('phoneSecondaryExample', 'Secondary Phone')} value={createForm.phoneSecondary || ''} onChange={(e) => setCreateForm((prev) => ({ ...prev, phoneSecondary: e.target.value }))} />
            
            <div className="col-span-2 flex items-center gap-2 mt-2 border-t pt-4">
               <input type="checkbox" id="published-create" checked={createForm.published} onChange={(e) => setCreateForm((prev) => ({ ...prev, published: e.target.checked }))} className="rounded border-input text-primary focus:ring-primary" />
               <label htmlFor="published-create" className="text-sm font-medium">Publish to Public Website</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('cancel', 'Cancel')}</Button>
            <Button onClick={() => void handleCreateBranch()} disabled={isSubmitting}>{isSubmitting ? t('creating', 'Creating...') : t('addBranch', 'Add Branch')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Table Card Container */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap text-sm">
            <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('branchName', 'Branch Name')}</th>
                <th className="px-4 py-3 font-semibold">{t('code', 'Code')}</th>
                <th className="px-4 py-3 font-semibold">{t('location', 'Location')}</th>
                <th className="px-4 py-3 font-semibold">{t('status', 'Status')}</th>
                <th className="px-4 py-3 font-semibold text-center">{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBranches.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>No branches found.</td>
                </tr>
              ) : (
                paginatedBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => startEditBranch(branch)}
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">{branch.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{branch.code}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{branch.location || '—'}</td>
                    <td className="px-4 py-3">{getStatusBadge(branch.status || 'OPERATIONAL')}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-6">
                        <button
                          onClick={() => startEditBranch(branch)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title={t('edit', 'Edit')}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onRequestDeleteBranch(branch.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title={t('delete', 'Delete')}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4 border-t border-slate-100">
          <span className="text-sm text-slate-500 font-medium">
            Showing {activeBranches.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(page * ITEMS_PER_PAGE, activeBranches.length)} of {activeBranches.length}
          </span>
          <div className="flex gap-2 items-center">
            <button
              className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-sm font-bold text-slate-500 px-2">{page} / {totalPages}</span>
            <button
              className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(editingBranchId)} onOpenChange={(open) => { if (!open) closeEditBranchDialog(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('editBranch', 'Edit Branch')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">{t('branchName', 'Branch Name')} <span className="text-red-500">*</span></label><Input value={editingBranchForm.name} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={t('branchNameExample', 'e.g. Bole Branch')} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">{t('code', 'Code')} <span className="text-red-500">*</span></label><Input value={editingBranchForm.code} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, code: e.target.value }))} placeholder={t('branchCodeExample', 'e.g. BL-001')} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">{t('location', 'Location')} <span className="text-red-500">*</span></label><Input value={editingBranchForm.location} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, location: e.target.value }))} placeholder={t('locationExample', 'e.g. Addis Ababa')} /></div>
            
            <Select value={editingBranchForm.status} onValueChange={(value) => setEditingBranchForm((prev) => ({ ...prev, status: value as 'OPERATIONAL' | 'MAINTENANCE' | 'CLOSED'  }))}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectStatus', 'Select status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATIONAL">{t('operational', 'Operational')}</SelectItem>
                <SelectItem value="MAINTENANCE">{t('maintenance', 'Maintenance')}</SelectItem>
                <SelectItem value="CLOSED">{t('closed', 'Closed')}</SelectItem>
              </SelectContent>
            </Select>

            <Input value={editingBranchForm.manager} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, manager: e.target.value }))} placeholder={t('managerExample', 'Manager Name')} />
            <Input value={editingBranchForm.officeHours} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, officeHours: e.target.value }))} placeholder={t('officeHoursExample', 'Office Hours (e.g. Mon-Fri 8:30 AM - 5:30 PM)')} />
            <Input value={editingBranchForm.mapUrl} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, mapUrl: e.target.value }))} placeholder={t('mapUrlExample', 'Google Maps URL')} />
            <Input value={editingBranchForm.phonePrimary} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, phonePrimary: e.target.value }))} placeholder={t('phonePrimaryExample', 'Primary Phone')} />
            <Input value={editingBranchForm.phoneSecondary} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, phoneSecondary: e.target.value }))} placeholder={t('phoneSecondaryExample', 'Secondary Phone')} />
            
            <div className="col-span-2 flex items-center gap-2 mt-2 border-t pt-4">
               <input type="checkbox" id="published-edit" checked={editingBranchForm.published} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, published: e.target.checked }))} className="rounded border-input text-primary focus:ring-primary" />
               <label htmlFor="published-edit" className="text-sm font-medium">Publish to Public Website</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void saveBranchEdit()} disabled={savingBranch}>{savingBranch ? t('saving', 'Saving...') : t('saveBranch', 'Save Branch')}</Button>
            <Button variant="outline" onClick={closeEditBranchDialog}>{t('cancel', 'Cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Branch Modal */}
      <ConfirmDeleteModal
        open={!!deleteTargetBranchId}
        loading={isDeletingBranch}
        title="Delete Branch?"
        description="Are you sure you want to delete this branch? This action cannot be undone."
        onConfirm={confirmDeleteBranch}
        onClose={() => setDeleteTargetBranchId(null)}
      />
    </div>
  );
}
