import { useMemo, useState, useEffect } from 'react';
import DataTable from '@/components/admin/DataTable';
import { useAdminI18n } from '@/lib/uiI18n';
import { AdminBranch, useAdminBranches } from '@/hooks/useAdminBranches';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/adminApi';
import { toastApiError } from '@/lib/apiToast';
import { toast } from 'sonner';
// If using shadcn/ui or Radix UI
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useCallback } from 'react';
interface CreateBranchForm {
  name: string;
  code: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CLOSED';
  managerName?: string;
}

const defaultForm: CreateBranchForm = {
  name: '',
  code: '',
  status: 'OPERATIONAL',
  managerName: '',
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
      await adminFetch('/api/admin/settings/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          code: createForm.code.trim().toUpperCase(),
          status: createForm.status,
          managerName: createForm.managerName?.trim() || null,
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

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (!branchId) return;
    if (!window.confirm(t('confirmDeleteBranch', 'Are you sure you want to delete this branch?'))) {
      return;
    }
    try {
      const response = await window.fetch(`/api/admin/settings/branches/${String(branchId).trim()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Server status: ${response.status}`);
      }
      toast.success(t('adminBranchDeletedSuccess', 'Branch deleted successfully'));
      setDeletedBranchIds((prev) => [...prev, branchId]);
      await reload?.();
    } catch (error) {
      toastApiError(error, t('adminBranchDeleteFailed', 'Failed to delete branch'));
    }
  },[reload, t]);

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

  useMemo(() => {
    return branches.filter((branch) => {
      if (deletedBranchIds.includes(branch.id)) return false;
      const status = (branch.status || '').toUpperCase();
      return status !== 'INACTIVE' && status !== 'CLOSED';
    });
  }, [branches, deletedBranchIds]);

  const rows = useMemo(() => {
    return branches
      .filter((branch) => !deletedBranchIds.includes(branch.id))
      .map((branch) => {
        const currentId = branch.id;
        const deleteBtn = (
          <button
            type="button"
            data-global-delete-id={currentId}
            onClick={() => void handleDeleteBranch(currentId)}
            className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        );
        const editBtn = (
          <button
            type="button"
            data-global-edit-id={currentId}
            onClick={() => startEditBranch(branch)}
            className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 mr-2"
          >
            Edit
          </button>
        );
        return [
          branch.name || '—',
          branch.code || '—',
          branch.location || '—',
          branch.status || 'UNKNOWN',
          <>{editBtn}{deleteBtn}</>,
        ];
      });
  }, [branches, deletedBranchIds,handleDeleteBranch]);

  // Edit state
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchForm, setEditingBranchForm] = useState({ name: '', code: '', location: '', manager: '', status: 'OPERATIONAL' });
  const [savingBranch, setSavingBranch] = useState(false);

  const startEditBranch = (branch: AdminBranch) => {
    setEditingBranchId(branch.id);
    setEditingBranchForm({
      name: branch.name,
      code: branch.code || '',
      location: branch.location,
      manager: branch.manager || '',
      status: branch.status,
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
      await adminFetch<{ branch: unknown }>(`/api/admin/settings/branches/${editingBranchId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingBranchForm.name.trim(),
          code: editingBranchForm.code.trim().toUpperCase(),
          location: editingBranchForm.location.trim(),
          manager: editingBranchForm.manager.trim() || null,
          status: editingBranchForm.status,
        }),
      });
      toast.success(t('branchUpdated', 'Branch updated'));
      setEditingBranchId(null);
      // Update local branches state via reload or mutating hook; assume reload
      await reload?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('failedUpdateBranch', 'Failed to update branch'));
    } finally {
      setSavingBranch(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">{t('adminBranchManagementTitle', 'Branch Management')}</h2>
        <Button onClick={() => setIsCreateOpen(true)}>{t('addBranch', 'Add Branch')}</Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('adminCreateBranch', 'Create Branch')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder={t('branchNameExample', 'e.g. Bole Branch')} value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input placeholder={t('branchCodeExample', 'e.g. BL-001')} value={createForm.code} onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value }))} />
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
            <Input placeholder={t('managerOptionalExample', 'e.g. Hana Mulu (optional)')} value={createForm.managerName || ''} onChange={(e) => setCreateForm((prev) => ({ ...prev, managerName: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('cancel', 'Cancel')}</Button>
            <Button onClick={() => void handleCreateBranch()} disabled={isSubmitting}>{isSubmitting ? t('creating', 'Creating...') : t('addBranch', 'Add Branch')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable headers={[t('branchName', 'Branch Name'), t('code', 'Code'), t('location', 'Location'), t('status', 'Status'), t('actions', 'Actions')]} rows={rows} />

      <Dialog open={Boolean(editingBranchId)} onOpenChange={(open) => { if (!open) closeEditBranchDialog(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('editBranch', 'Edit Branch')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={editingBranchForm.name} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={t('branchNameExample', 'e.g. Bole Branch')} />
            <Input value={editingBranchForm.code} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, code: e.target.value }))} placeholder={t('branchCodeExample', 'e.g. BL-001')} />
            <Input value={editingBranchForm.location} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, location: e.target.value }))} placeholder={t('locationExample', 'e.g. Addis Ababa')} />
            <Input value={editingBranchForm.manager} onChange={(e) => setEditingBranchForm((prev) => ({ ...prev, manager: e.target.value }))} placeholder={t('managerExample', 'e.g. Hana Mulu')} />
          </div>
          <DialogFooter>
            <Button onClick={() => void saveBranchEdit()} disabled={savingBranch}>{savingBranch ? t('saving', 'Saving...') : t('saveBranch', 'Save Branch')}</Button>
            <Button variant="outline" onClick={closeEditBranchDialog}>{t('cancel', 'Cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
