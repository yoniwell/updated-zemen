import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, ImagePlus, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { resolvePublicAssetUrl } from '@/lib/publicContentApi';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';

const BASE = getApiBaseUrl();

type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  imageUrl?: string;
  category: string;
  status: string;
  publishedAt?: string;
  createdAt: string;
};

const NEWS_CATEGORIES = ['General', 'Announcement', 'Community', 'Financial Update', 'Events'];
const empty = (): Partial<NewsItem> => ({ title: '', excerpt: '', content: '', imageUrl: '', category: 'General', status: 'DRAFT' });
const ITEMS_PER_PAGE = 10;

export default function NewsManager() {
  const [items, setItems]           = useState<NewsItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<Partial<NewsItem>>(empty());
  const [saving, setSaving]         = useState(false);
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await adminFetch('/api/news/admin/all');
      setItems(res?.news ?? res?.data ?? (Array.isArray(res) ? res : []));
    } catch { toast.error('Failed to load news'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.excerpt.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const openCreate = () => { setEditId(null); setForm(empty()); setImageFile(null); setImagePreview(''); setDialogOpen(true); };
  const openEdit   = (item: NewsItem) => { setEditId(item.id); setForm({ ...item }); setImageFile(null); setImagePreview(item.imageUrl ? resolvePublicAssetUrl(item.imageUrl) : ''); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm(empty()); setImageFile(null); setImagePreview(''); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImageFor = async (id: string) => {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const token = localStorage.getItem('zemen_admin_token') || localStorage.getItem('adminToken');
      const fd = new FormData();
      fd.append('file', imageFile);
      const res = await fetch(`${BASE}/api/news/${id}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      return json?.data?.imageUrl ?? json?.url ?? null;
    } catch { toast.error('Image upload failed'); return null; }
    finally { setUploadingImage(false); }
  };

  const handleSave = async () => {
    if (!form.title || !form.excerpt) { toast.error('Title and excerpt are required'); return; }
    setSaving(true);
    try {
      const payload = { title: form.title, excerpt: form.excerpt, content: form.content, category: form.category, status: form.status, imageUrl: form.imageUrl };

      let id = editId;
      if (id) {
        await adminFetch(`/api/news/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const res: any = await adminFetch('/api/news', { method: 'POST', body: JSON.stringify(payload) });
        id = res?.data?.id ?? res?.id;
      }

      if (id && imageFile) {
        await uploadImageFor(id);
      }

      toast.success(editId ? 'Article updated!' : 'Article created!');
      closeDialog();
      load();
    } catch (e: any) { toast.error(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onRequestDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/news/${deleteTargetId}`, { method: 'DELETE' });
      toast.success('News article deleted successfully');
      load();
    } catch { 
      toast.error('Delete failed'); 
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
          <h1 className="text-xl font-bold text-slate-900">News Articles</h1>
          <p className="text-xs text-slate-500 mt-0.5">Published articles appear immediately on the public News page.</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1.5 font-bold shadow-sm">
          <Plus className="w-4 h-4" /> Add Article
        </Button>
      </div>

      {/* 2. Search Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm"
          />
        </div>
      </div>

      {/* 3. Card Table Container */}
      {loading ? (
        <p className="rounded-md p-4 text-sm text-muted-foreground">Loading news articles...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
              <AlertCircle className="w-6 h-6 mb-2 text-slate-300" />
              <p className="text-sm font-medium">No matching articles found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-sm">
                <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Image</th>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Excerpt</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(item => (
                    <tr key={item.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => openEdit(item)}>
                      <td className="px-4 py-3">
                        {item.imageUrl ? (
                          <img src={resolvePublicAssetUrl(item.imageUrl)} alt="" className="w-10 h-10 rounded object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-medium">No img</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 max-w-xs truncate">{item.title}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{item.excerpt}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-medium">{item.category}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${item.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-6">
                          <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit" onClick={() => openEdit(item)}>
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button className="text-slate-400 hover:text-red-600 transition-colors" title="Delete" onClick={() => onRequestDelete(item.id)}>
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Article' : 'New News Article'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title..." />
            </div>
            <div className="space-y-1.5">
              <Label>Excerpt (short summary)</Label>
              <Textarea rows={2} value={form.excerpt || ''} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Brief summary shown in the news list..." />
            </div>
            <div className="space-y-1.5">
              <Label>Full Content</Label>
              <Textarea rows={6} value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Full article body shown on the detail page..." />
            </div>

            {/* Image Upload */}
            <div className="space-y-1.5">
              <Label>Article Image (any image format)</Label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-400 transition-colors text-center"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(''); setForm(f => ({ ...f, imageUrl: '' })); }}
                      className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
                    >
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-400 gap-2 py-4">
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-sm">Click to upload an image (JPG, PNG, WEBP, GIF...)</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.category || 'General'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.status || 'DRAFT'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="DRAFT">Draft (not visible on website)</option>
                  <option value="PUBLISHED">Published (visible on website)</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving || uploadingImage}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {(saving || uploadingImage) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploadingImage ? 'Uploading image...' : 'Saving...'}</> : 'Save Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={!!deleteTargetId}
        loading={deleting}
        title="Delete News Article?"
        description="Are you sure you want to delete this news article? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
