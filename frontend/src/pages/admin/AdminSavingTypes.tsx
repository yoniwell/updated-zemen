import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';

interface SavingType {
  id: string;
  name: string;
  isActive: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
  membershipFee?: number | null;
}

const fmt = (n: number | null | undefined) => (n != null ? `${n.toLocaleString()} ETB` : '—');

export default function AdminSavingTypes() {
  const [savingTypes, setSavingTypes] = useState<SavingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<SavingType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [membershipFee, setMembershipFee] = useState('');

  const fetchSavingTypes = async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/api/settings/saving-types?includeInactive=true');
      setSavingTypes(data.savingTypes || []);
    } catch {
      toast.error('Failed to load saving types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavingTypes();
  }, []);

  const openModal = (type: SavingType | null = null) => {
    setEditingType(type);
    if (type) {
      setName(type.name);
      setIsActive(type.isActive);
      setMinAmount(type.minAmount != null ? String(type.minAmount) : '');
      setMaxAmount(type.maxAmount != null ? String(type.maxAmount) : '');
      setMembershipFee(type.membershipFee != null ? String(type.membershipFee) : '500');
    } else {
      setName('');
      setIsActive(true);
      setMinAmount('');
      setMaxAmount('');
      setMembershipFee('500');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name,
      isActive,
      minAmount: minAmount !== '' ? Number(minAmount) : null,
      maxAmount: maxAmount !== '' ? Number(maxAmount) : null,
      membershipFee: membershipFee !== '' ? Number(membershipFee) : null,
    };

    try {
      if (editingType) {
        await adminFetch(`/api/settings/saving-types/${editingType.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Saving type updated successfully');
      } else {
        await adminFetch('/api/settings/saving-types', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Saving type created successfully');
      }
      closeModal();
      fetchSavingTypes();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save saving type');
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
      await adminFetch(`/api/settings/saving-types/${deleteTargetId}`, {
        method: 'DELETE',
      });
      toast.success('Saving type deleted successfully');
      fetchSavingTypes();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete saving type');
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
          <h1 className="text-xl font-bold text-slate-900">Saving Types Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure system saving categories, deposit limits, membership fees, and availability</p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Saving Type
        </button>
      </div>

      {/* 2. Table */}
      {loading ? (
        <p className="rounded-md p-4 text-sm text-muted-foreground">Loading saving types...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Membership Fee</th>
                  <th className="px-4 py-3 font-semibold">Min Amount</th>
                  <th className="px-4 py-3 font-semibold">Max Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savingTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">No saving types found. Create one to get started.</td>
                  </tr>
                ) : (
                  savingTypes.slice((page - 1) * 10, page * 10).map((type) => (
                    <tr key={type.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => openModal(type)}>
                      <td className="px-4 py-3 font-bold text-slate-900">{type.name}</td>
                      <td className="px-4 py-3 text-blue-900 font-extrabold">{fmt(type.membershipFee)}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{fmt(type.minAmount)}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{fmt(type.maxAmount)}</td>
                      <td className="px-4 py-3">
                        {type.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
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
              Showing {savingTypes.length === 0 ? 0 : (page - 1) * 10 + 1}-
              {Math.min(page * 10, savingTypes.length)} of {savingTypes.length}
            </span>
            <div className="flex gap-2 items-center">
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm font-bold text-slate-500 px-2">{page} / {Math.max(1, Math.ceil(savingTypes.length / 10))}</span>
              <button
                className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                disabled={page >= Math.ceil(savingTypes.length / 10)}
                onClick={() => setPage((p) => Math.min(Math.ceil(savingTypes.length / 10), p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-black text-slate-900">{editingType ? 'Edit' : 'Add'} Saving Type</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Regular Saving"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Required Membership Fee (ETB)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={membershipFee}
                  onChange={(e) => setMembershipFee(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Min Amount (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Max Amount (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Active (Visible in public portal)</label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={Boolean(deleteTargetId)}
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Saving Type"
        description="Are you sure you want to delete this saving type? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
