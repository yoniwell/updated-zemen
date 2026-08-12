import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { Plus, Edit2, Pencil, Trash2, CheckCircle2, XCircle, DollarSign, Clock } from 'lucide-react';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';

interface LoanType {
  id: string;
  name: string;
  isActive: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
  minTenure?: number | null;
  maxTenure?: number | null;
}

const fmt = (n: number | null | undefined) =>
  n != null ? n.toLocaleString() : '—';

export default function AdminLoanTypes() {
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<LoanType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [tenure, setTenure] = useState('');

  const fetchLoanTypes = async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/api/settings/loan-types?includeInactive=true');
      setLoanTypes(data.loanTypes || []);
    } catch {
      toast.error('Failed to load loan types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  const openModal = (type: LoanType | null = null) => {
    setEditingType(type);
    if (type) {
      setName(type.name);
      setIsActive(type.isActive);
      setMinAmount(type.minAmount != null ? String(type.minAmount) : '');
      setMaxAmount(type.maxAmount != null ? String(type.maxAmount) : '');
      setTenure(type.maxTenure != null ? String(type.maxTenure) : '');
    } else {
      setName('');
      setIsActive(true);
      setMinAmount('');
      setMaxAmount('');
      setTenure('');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const minA = minAmount !== '' ? parseFloat(minAmount) : null;
    const maxA = maxAmount !== '' ? parseFloat(maxAmount) : null;
    const maxT = tenure !== '' ? parseInt(tenure) : null;

    if (minA != null && maxA != null && minA > maxA) {
      toast.error('Minimum amount cannot exceed maximum amount');
      return;
    }

    const payload = {
      name,
      isActive,
      minAmount: minA,
      maxAmount: maxA,
      maxTenure: maxT,
      minTenure: null, // Always null as we use fixed tenure now
    };

    setSaving(true);
    try {
      if (editingType) {
        await adminFetch(`/api/settings/loan-types/${editingType.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Loan type updated successfully');
      } else {
        await adminFetch('/api/settings/loan-types', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Loan type created successfully');
      }
      closeModal();
      fetchLoanTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save loan type');
    } finally {
      setSaving(false);
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/settings/loan-types/${deleteTargetId}`, { method: 'DELETE' });
      toast.success('Loan type deleted successfully');
      fetchLoanTypes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete loan type');
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* 1. Header & Primary Action */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Loan Types</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage dynamic loan types, amount ranges and tenure constraints for the loan portal
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Loan Type
        </button>
      </div>

      {/* 2. Table */}
      {loading ? (
        <p className="rounded-md p-4 text-sm text-muted-foreground">Loading loan types...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Amount Range (ETB)</th>
                  <th className="px-4 py-3 font-semibold">Tenure (months)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loanTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No loan types found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  loanTypes.slice((page - 1) * 10, page * 10).map((type) => (
                    <tr key={type.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => openModal(type)}>
                      <td className="px-4 py-3 font-bold text-slate-900">{type.name}</td>
                      <td className="px-4 py-3">
                        {type.minAmount != null || type.maxAmount != null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <DollarSign className="h-3 w-3 text-blue-400" />
                            {fmt(type.minAmount)} – {fmt(type.maxAmount)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No limit</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {type.maxTenure != null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <Clock className="h-3 w-3 text-blue-400" />
                            {fmt(type.maxTenure)} mo
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No limit</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {type.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-6">
                          <button
                            onClick={() => openModal(type)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(type.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
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
              Showing {loanTypes.length === 0 ? 0 : (page - 1) * 10 + 1}-
              {Math.min(page * 10, loanTypes.length)} of {loanTypes.length}
            </span>
            <div className="flex gap-2 items-center">
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm font-bold text-slate-500 px-2">{page} / {Math.max(1, Math.ceil(loanTypes.length / 10))}</span>
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={page >= Math.ceil(loanTypes.length / 10)}
                onClick={() => setPage((p) => Math.min(Math.ceil(loanTypes.length / 10), p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-black text-white">
                {editingType ? 'Edit' : 'Add'} Loan Type
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Configure name, amount range, and tenure options for this loan type.
              </p>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Name & Status row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g. Personal Loan"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Status
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Amount Range */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                  Loan Amount Range (ETB)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Minimum (ETB)</label>
                    <input
                      type="number"
                      min={0}
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Maximum (ETB)</label>
                    <input
                      type="number"
                      min={0}
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="e.g. 500000"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">Leave empty for no limit.</p>
              </div>

              {/* Fixed Tenure */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Tenure (Months)
                </label>
                <div>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g. 12"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  The fixed tenure length for this loan type. Applicants will see this duration.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Loan Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={!!deleteTargetId}
        loading={deleting}
        title="Delete Loan Type?"
        description="Are you sure you want to delete this loan type? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
