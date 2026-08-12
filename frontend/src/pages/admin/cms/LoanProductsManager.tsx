import React from 'react';
import { CmsPage, CmsDialog, RowActions, Input, Label, Textarea } from './CmsPageShell';

type LoanProduct = { id: string; name: string; purpose: string; suited: string; docs: string; maxAmount: string; interestRate: string; maxTerm: string; color: string; sortOrder: number; status: string };

export default function LoanProductsManager() {
  return (
    <CmsPage<LoanProduct>
      title="Loan Products"
      description="Manage loan products displayed on the public website."
      endpoint="/api/content/loan-products"
      collectionKey="loanProducts"
      columns={['Product Name', 'Purpose', 'Suited For', 'Required Docs', 'Max Amount', 'Interest Rate', 'Max Term', 'Status']}
      emptyDialog={() => ({ name: '', purpose: '', suited: '', docs: '', maxAmount: '', interestRate: '', maxTerm: '', color: 'border-l-primary', sortOrder: 0, status: 'DRAFT' })}
      renderRow={(item, onEdit, onDelete) => (
        <tr key={item.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onEdit(item)}>
          <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{item.purpose}</td>
          <td className="px-4 py-3 text-slate-500 text-xs">{item.suited}</td>
          <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{item.docs}</td>
          <td className="px-4 py-3 text-slate-900 font-semibold text-xs">{item.maxAmount}</td>
          <td className="px-4 py-3 text-slate-700 text-xs">{item.interestRate}</td>
          <td className="px-4 py-3 text-slate-700 text-xs">{item.maxTerm}</td>
          <td className="px-4 py-3">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${item.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
          </td>
          <RowActions item={item} onEdit={onEdit} onDelete={onDelete} />
        </tr>
      )}
      renderDialog={(state, onClose, onSave) => (
        <CmsDialog open={state.open} onClose={onClose} onSave={onSave} saving={state.saving} title={state.editId ? 'Edit Loan Product' : 'Add Loan Product'}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Product Name</Label>
              <Input value={state.form.name || ''} onChange={e => state.setForm({ ...state.form, name: e.target.value })} placeholder="e.g. Business Loan" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Purpose</Label>
              <Textarea rows={2} value={state.form.purpose || ''} onChange={e => state.setForm({ ...state.form, purpose: e.target.value })} placeholder="What is this loan for?" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Suited For</Label>
              <Input value={state.form.suited || ''} onChange={e => state.setForm({ ...state.form, suited: e.target.value })} placeholder="Who is this loan best for?" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Required Documents</Label>
              <Textarea rows={2} value={state.form.docs || ''} onChange={e => state.setForm({ ...state.form, docs: e.target.value })} placeholder="List required documents..." />
            </div>
            <div className="space-y-1.5">
              <Label>Max Amount (ETB)</Label>
              <Input value={state.form.maxAmount || ''} onChange={e => state.setForm({ ...state.form, maxAmount: e.target.value })} placeholder="e.g. 5,000,000" />
            </div>
            <div className="space-y-1.5">
              <Label>Interest Rate</Label>
              <Input value={state.form.interestRate || ''} onChange={e => state.setForm({ ...state.form, interestRate: e.target.value })} placeholder="e.g. 12%" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Term</Label>
              <Input value={state.form.maxTerm || ''} onChange={e => state.setForm({ ...state.form, maxTerm: e.target.value })} placeholder="e.g. 84 months" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={state.form.sortOrder ?? 0} onChange={e => state.setForm({ ...state.form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5 col-span-2">
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
