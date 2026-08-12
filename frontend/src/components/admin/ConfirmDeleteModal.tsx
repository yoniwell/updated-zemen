import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title = 'Delete Item?',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all scale-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header close button */}
        <div className="flex justify-end p-3 pb-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal content */}
        <div className="px-6 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-inner">
            <Trash2 className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed mb-6">
            {description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Deleting…</span>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {confirmText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
