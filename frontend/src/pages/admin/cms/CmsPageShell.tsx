import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CmsService = { id: string; title: string; description: string; features: string[]; ctaLabel?: string; ctaPath?: string; sortOrder: number; status: string };
export type CmsSaving  = CmsService;
export type CmsLoanProduct = { id: string; name: string; purpose: string; suited: string; docs: string; maxAmount: string; interestRate: string; maxTerm: string; color: string; sortOrder: number; status: string };
export type CmsFaq = { id: string; question: string; answer: string; category: string; published: boolean };

// ─── Shared CMS Page Shell ────────────────────────────────────────────────────

interface CmsPageProps<T> {
  title: string;
  description: string;
  endpoint: string;           // e.g. '/api/content/services'
  collectionKey: string;      // key in the response payload
  columns?: string[];         // column header titles for the table
  renderRow: (item: T, onEdit: (item: T) => void, onDelete: (id: string) => void) => React.ReactNode;
  renderDialog: (state: DialogState<T>, onClose: () => void, onSave: () => Promise<void>) => React.ReactNode;
  emptyDialog: () => Partial<T>;
}

export interface DialogState<T> {
  open: boolean;
  editId: string | null;
  form: Partial<T>;
  setForm: (v: Partial<T>) => void;
  saving: boolean;
}

const ITEMS_PER_PAGE = 10;

export function CmsPage<T extends { id: string }>({
  title, description, endpoint, collectionKey, columns, renderRow, renderDialog, emptyDialog,
}: CmsPageProps<T>) {
  const [items, setItems]         = useState<T[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<Partial<T>>({});
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(endpoint) as any;
      if (Array.isArray(res)) {
        setItems(res);
      } else if (Array.isArray(res?.[collectionKey])) {
        setItems(res[collectionKey]);
      } else if (Array.isArray(res?.data)) {
        setItems(res.data);
      } else {
        setItems([]);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [endpoint, collectionKey]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const openCreate = () => { setEditId(null); setForm(emptyDialog()); setDialogOpen(true); };
  const openEdit   = (item: T) => { setEditId(item.id); setForm(item as Partial<T>); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm({}); };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item: any) => {
      const str = Object.values(item).filter(v => typeof v === 'string' || typeof v === 'number').join(' ').toLowerCase();
      return str.includes(q);
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handleSave = async () => {
    const keys = Object.keys(form);
    const emptyKey = keys.find(k => typeof form[k] === 'string' && (k === 'question' || k === 'answer' || k === 'title' || k === 'name' || k === 'description') && !form[k]?.trim());
    if (emptyKey) {
      toast.error(`Please enter a valid ${emptyKey}`);
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await adminFetch(`${endpoint}/${editId}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('Updated successfully');
      } else {
        await adminFetch(endpoint, { method: 'POST', body: JSON.stringify(form) });
        toast.success('Created successfully');
      }
      closeDialog();
      load();
    } catch (e: any) { 
      toast.error(e?.message || 'Save failed'); 
    } finally { 
      setSaving(false); 
    }
  };

  const onRequestDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(deleteTargetId);
    try {
      await adminFetch(`${endpoint}/${deleteTargetId}`, { method: 'DELETE' });
      toast.success('Deleted');
      load();
    } catch { 
      toast.error('Delete failed'); 
    } finally { 
      setDeleting(null);
      setDeleteTargetId(null);
    }
  };

  const dialogState: DialogState<T> = { open: dialogOpen, editId, form, setForm, saving };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* 1. Header & Primary Action */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1.5 font-bold shadow-sm">
          <Plus className="w-4 h-4" /> Add New
        </Button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm"
          />
        </div>
      </div>

      {/* 3. Card Table Container */}
      {loading ? (
        <p className="rounded-md p-4 text-sm text-muted-foreground">Loading {title.toLowerCase()}...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              {columns && columns.length > 0 && (
                <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-3 font-semibold">{col}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={(columns?.length || 0) + 1} className="px-4 py-8 text-center text-sm text-slate-500">
                      <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                        <AlertCircle className="w-6 h-6 mb-2 text-slate-300" />
                        <p className="text-sm font-medium">No {title.toLowerCase()} found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => React.cloneElement(renderRow(item, openEdit, onRequestDelete) as React.ReactElement, { key: item.id || idx }))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4 border-t border-slate-100">
            <span className="text-sm text-slate-500 font-medium">
              Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length}
            </span>
            <div className="flex gap-2 items-center">
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm font-bold text-slate-500 px-2">{currentPage} / {totalPages}</span>
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog */}
      {renderDialog(dialogState, closeDialog, handleSave)}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={!!deleteTargetId}
        loading={!!deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

// ─── Shared row action buttons ────────────────────────────────────────────────
export function RowActions({ item, onEdit, onDelete }: { item: any; onEdit: (i: any) => void; onDelete: (id: string) => void }) {
  return (
    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-center gap-6">
        <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit" onClick={() => onEdit(item)}>
          <Pencil className="w-5 h-5" />
        </button>
        <button className="text-slate-400 hover:text-red-600 transition-colors" title="Delete" onClick={() => onDelete(item.id)}>
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </td>
  );
}

// ─── Shared Dialog shell ──────────────────────────────────────────────────────
export function CmsDialog({ open, onClose, onSave, saving, title, children }: {
  open: boolean; onClose: () => void; onSave: () => Promise<void>; saving: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Re-export commonly used UI ──────────────────────────────────────────────
export { Input, Label, Textarea, Button };
