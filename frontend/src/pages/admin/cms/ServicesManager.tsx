import React from 'react';
import { CmsPage, CmsDialog, RowActions, Input, Label, Textarea } from './CmsPageShell';

type CmsService = { id: string; title: string; description: string; features: string[]; ctaLabel?: string; ctaPath?: string; sortOrder: number; status: string };

const empty = () => ({ title: '', description: '', features: [], sortOrder: 0, status: 'DRAFT' });

export default function ServicesManager() {
  return (
    <CmsPage<CmsService>
      title="Services"
      description="Manage the list of services offered by Zemen SACCO."
      endpoint="/api/content/services"
      collectionKey="services"
      columns={['Title', 'Description', 'Features', 'Status']}
      emptyDialog={empty}
      renderRow={(item, onEdit, onDelete) => (
        <tr key={item.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onEdit(item)}>
          <td className="px-4 py-3 font-bold text-slate-900">{item.title}</td>
          <td className="px-4 py-3 text-slate-600 max-w-sm truncate">{item.description}</td>
          <td className="px-4 py-3 text-slate-500 text-xs font-mono font-medium">{(item.features || []).length} features</td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${item.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {item.status}
            </span>
          </td>
          <RowActions item={item} onEdit={onEdit} onDelete={onDelete} />
        </tr>
      )}
      renderDialog={(state, onClose, onSave) => (
        <CmsDialog
          open={state.open}
          onClose={onClose}
          onSave={onSave}
          saving={state.saving}
          title={state.editId ? 'Edit Service' : 'Add Service'}
        >
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={state.form.title || ''} onChange={e => state.setForm({ ...state.form, title: e.target.value })} placeholder="e.g. Savings Account" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={state.form.description || ''} onChange={e => state.setForm({ ...state.form, description: e.target.value })} placeholder="Brief description of the service..." />
          </div>
          <div className="space-y-1.5">
            <Label>Features (one per line)</Label>
            <Textarea rows={4} value={(state.form.features || []).join('\n')} onChange={e => state.setForm({ ...state.form, features: e.target.value.split('\n') })} placeholder="Feature 1&#10;Feature 2" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm"
              value={state.form.status || 'DRAFT'}
              onChange={e => state.setForm({ ...state.form, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
            </select>
          </div>
        </CmsDialog>
      )}
    />
  );
}
