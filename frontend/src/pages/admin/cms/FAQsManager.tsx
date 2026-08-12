import React from 'react';
import { CmsPage, CmsDialog, RowActions, Input, Label, Textarea } from './CmsPageShell';

type Faq = { id: string; question: string; answer: string; category: string; published: boolean };

const FAQ_CATEGORIES = ['General', 'Membership', 'Loans', 'Savings'];

export default function FAQsManager() {
  return (
    <CmsPage<Faq>
      title="FAQs"
      description="Manage frequently asked questions on the public website."
      endpoint="/api/content/faqs"
      collectionKey="faqs"
      columns={['Question', 'Answer', 'Category', 'Status']}
      emptyDialog={() => ({ question: '', answer: '', category: 'General', published: false })}
      renderRow={(item, onEdit, onDelete) => (
        <tr key={item.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onEdit(item)}>
          <td className="px-4 py-3 font-bold text-slate-900 max-w-xs truncate">{item.question}</td>
          <td className="px-4 py-3 text-slate-600 max-w-md truncate">{item.answer}</td>
          <td className="px-4 py-3 text-slate-500 text-xs font-medium">{item.category}</td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${item.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {item.published ? 'PUBLISHED' : 'DRAFT'}
            </span>
          </td>
          <RowActions item={item} onEdit={onEdit} onDelete={onDelete} />
        </tr>
      )}
      renderDialog={(state, onClose, onSave) => (
        <CmsDialog open={state.open} onClose={onClose} onSave={onSave} saving={state.saving} title={state.editId ? 'Edit FAQ' : 'Add FAQ'}>
          <div className="space-y-1.5">
            <Label>Question</Label>
            <Input value={state.form.question || ''} onChange={e => state.setForm({ ...state.form, question: e.target.value })} placeholder="What is...?" />
          </div>
          <div className="space-y-1.5">
            <Label>Answer</Label>
            <Textarea rows={4} value={state.form.answer || ''} onChange={e => state.setForm({ ...state.form, answer: e.target.value })} placeholder="The answer to the question..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={state.form.category || 'General'} onChange={e => state.setForm({ ...state.form, category: e.target.value })}>
                {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={state.form.published ? 'true' : 'false'} onChange={e => state.setForm({ ...state.form, published: e.target.value === 'true' })}>
                <option value="false">Draft</option>
                <option value="true">Published</option>
              </select>
            </div>
          </div>
        </CmsDialog>
      )}
    />
  );
}
