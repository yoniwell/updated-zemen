import React from 'react';
import { CmsPage, CmsDialog, RowActions, Input, Label, Textarea } from './CmsPageShell';

type Saving = { id: string; title: string; description: string; features: string[]; ctaLabel?: string; ctaPath?: string; sortOrder: number; status: string };

export default function SavingsManager() {
  return (
    <CmsPage<Saving>
      title="Savings Products"
      description="Manage savings products shown on the public website."
      endpoint="/api/content/savings"
      collectionKey="savings"
      columns={['Title', 'Description', 'Features', 'Status']}
      emptyDialog={() => ({ title: '', description: '', features: [], sortOrder: 0, status: 'DRAFT' })}
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
        <CmsDialog open={state.open} onClose={onClose} onSave={onSave} saving={state.saving} title={state.editId ? 'Edit Saving Product' : 'Add Saving Product'}>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={state.form.title || ''} onChange={e => state.setForm({ ...state.form, title: e.target.value })} placeholder="e.g. Regular Saving" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={state.form.description || ''} onChange={e => state.setForm({ ...state.form, description: e.target.value })} placeholder="Description..." />
          </div>
          <div className="space-y-1.5">
            <Label>Features (one per line)</Label>
            <Textarea rows={4} value={(state.form.features || []).join('\n')} onChange={e => state.setForm({ ...state.form, features: e.target.value.split('\n') })} placeholder="Feature 1&#10;Feature 2&#10;..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>CTA Label</Label>
              <Input value={state.form.ctaLabel || ''} onChange={e => state.setForm({ ...state.form, ctaLabel: e.target.value })} placeholder="Open Account" />
            </div>
            <div className="space-y-1.5">
              <Label>CTA Path</Label>
              <Input value={state.form.ctaPath || ''} onChange={e => state.setForm({ ...state.form, ctaPath: e.target.value })} placeholder="/membership" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={state.form.sortOrder ?? 0} onChange={e => state.setForm({ ...state.form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={state.form.status || 'DRAFT'} onChange={e => state.setForm({ ...state.form, status: e.target.value })}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>
        </CmsDialog>
      )}
    />
  );
}
