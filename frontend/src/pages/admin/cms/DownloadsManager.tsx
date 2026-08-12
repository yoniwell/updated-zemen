import React, { useEffect, useState, useCallback, useRef } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, AlertCircle, Upload, FolderOpen, ChevronRight, ChevronLeft, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';

const BASE = getApiBaseUrl();

type DownloadFile = { id: string; name: string; fileSize: string; fileType: string; fileUrl: string; published: boolean; sortOrder: number };
type Category = { id: string; name: string; sortOrder: number; published: boolean; files: DownloadFile[] };

const authHeaders = () => {
  const token = localStorage.getItem('zemen_admin_token') || localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${token}` };
};

export default function DownloadsManager() {
  const [categories, setCategories]       = useState<Category[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedCat, setSelectedCat]     = useState<Category | null>(null);
  const [filePage, setFilePage]           = useState(1);

  // Category dialog
  const [catDialog, setCatDialog]         = useState(false);
  const [catForm, setCatForm]             = useState({ name: '', sortOrder: 0 });
  const [savingCat, setSavingCat]         = useState(false);

  // File upload dialog
  const [fileDialog, setFileDialog]       = useState(false);
  const [fileUpload, setFileUpload]       = useState<File | null>(null);
  const [fileName, setFileName]           = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await adminFetch('/api/downloads/categories');
      const rawCats = Array.isArray(res) ? res : Array.isArray(res?.categories) ? res.categories : Array.isArray(res?.data) ? res.data : [];
      const cats: Category[] = rawCats.map((c: any) => ({
        ...c,
        files: Array.isArray(c?.files) ? c.files : [],
      }));
      setCategories(cats);
      setSelectedCat(prev => prev ? cats.find((c: Category) => c.id === prev.id) ?? null : (cats[0] ?? null));
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Category CRUD ─────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!catForm.name.trim()) { toast.error('Category name is required'); return; }
    setSavingCat(true);
    try {
      await adminFetch('/api/downloads/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catForm.name.trim(), sortOrder: catForm.sortOrder, published: true }),
      });
      toast.success('Category created');
      setCatDialog(false);
      setCatForm({ name: '', sortOrder: 0 });
      load();
    } catch { toast.error('Failed to create category'); }
    finally { setSavingCat(false); }
  };

  const toggleCategory = async (cat: Category) => {
    try {
      await adminFetch(`/api/downloads/categories/${cat.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: !cat.published }),
      });
      load();
    } catch { toast.error('Failed to update category'); }
  };

  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteCategory = async () => {
    if (!deleteCatId) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/downloads/categories/${deleteCatId}`, { method: 'DELETE' });
      toast.success('Category deleted successfully');
      if (selectedCat?.id === deleteCatId) setSelectedCat(null);
      load();
    } catch { 
      toast.error('Failed to delete category'); 
    } finally { 
      setDeleting(false);
      setDeleteCatId(null);
    }
  };

  const confirmDeleteFile = async () => {
    if (!deleteFileId) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/downloads/files/${deleteFileId}`, { method: 'DELETE' });
      toast.success('File deleted successfully');
      load();
    } catch { 
      toast.error('Failed to delete file'); 
    } finally { 
      setDeleting(false);
      setDeleteFileId(null);
    }
  };

  // ── File CRUD ─────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileUpload(f);
    setFileName(f.name);
  };

  const handleUploadFile = async () => {
    if (!fileUpload) { toast.error('Please select a file to upload'); return; }
    const catId = selectedCat?.id || (document.getElementById('upload-cat-select') as HTMLSelectElement)?.value;
    if (!catId) { toast.error('Please select a category'); return; }
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', fileUpload);
      fd.append('categoryId', catId);
      fd.append('name', fileName.trim() || fileUpload.name);
      const res = await fetch(`${BASE}/api/downloads/files`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      toast.success('File uploaded successfully!');
      setFileDialog(false);
      setFileUpload(null);
      setFileName('');
      load();
    } catch (e: any) { toast.error(e?.message || 'Upload failed'); }
    finally { setUploadingFile(false); }
  };

  const toggleFile = async (file: DownloadFile) => {
    try {
      await adminFetch(`/api/downloads/files/${file.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: !file.published }),
      });
      load();
    } catch { toast.error('Failed to update file'); }
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Delete this file?')) return;
    try {
      await adminFetch(`/api/downloads/files/${id}`, { method: 'DELETE' });
      toast.success('File deleted');
      load();
    } catch { toast.error('Failed to delete file'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Downloads</h1>
          <p className="text-sm text-slate-500 mt-1">Manage downloadable files organized by category on the public website.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setCatDialog(true)} className="flex items-center gap-2" variant="outline"><Plus className="w-4 h-4" /> Add Category</Button>
          <Button onClick={() => { setFileUpload(null); setFileName(''); setFileDialog(true); }} className="flex items-center gap-2" disabled={categories.length === 0}><Upload className="w-4 h-4" /> Upload File</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
          {/* Left: Category list */}
          <div className="w-64 shrink-0 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</div>
            <div className="overflow-y-auto flex-1">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-sm text-center">
                  <AlertCircle className="w-6 h-6 mb-2" />No categories yet
                </div>
              ) : categories.map(cat => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-slate-100 hover:bg-blue-50 transition-colors ${selectedCat?.id === cat.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                  onClick={() => setSelectedCat(cat)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 shrink-0 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-800 truncate">{cat.name}</div>
                      <div className="text-xs text-slate-400">{(cat.files?.length || 0)} files</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); toggleCategory(cat); }} className="text-slate-400 hover:text-blue-600 p-0.5">
                      {cat.published ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteCatId(cat.id); }} className="text-slate-300 hover:text-red-500 p-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Files */}
          <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {selectedCat ? <>Files in "{selectedCat.name}"</> : 'Select a category'}
              </span>

            </div>
            <div className="overflow-y-auto flex-1">
              {!selectedCat ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <ChevronRight className="w-8 h-8" /><p className="text-sm">Select a category to view its files</p>
                </div>
              ) : (selectedCat.files || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <AlertCircle className="w-6 h-6" /><p className="text-sm">No files uploaded yet</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-4 text-left text-xs font-semibold text-slate-500">File Name</th>
                      <th className="py-2 px-4 text-left text-xs font-semibold text-slate-500 hidden md:table-cell">Type</th>
                      <th className="py-2 px-4 text-left text-xs font-semibold text-slate-500 hidden md:table-cell">Size</th>
                      <th className="py-2 px-4 text-left text-xs font-semibold text-slate-500">Visible</th>
                      <th className="py-2 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCat.files || []).slice((filePage - 1) * 10, filePage * 10).map(file => (
                      <tr key={file.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">{file.name}</td>
                        <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                          <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-xs font-mono">{file.fileType}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{file.fileSize}</td>
                        <td className="py-3 px-4">
                          <button onClick={() => toggleFile(file)} className="flex items-center">
                            {file.published ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => setDeleteFileId(file.id)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination Footer */}
              <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4 border-t border-slate-100">
                <span className="text-sm text-slate-500 font-medium">
                  Showing {selectedCat.files.length === 0 ? 0 : (filePage - 1) * 10 + 1}-
                  {Math.min(filePage * 10, selectedCat.files.length)} of {selectedCat.files.length}
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                    disabled={filePage <= 1}
                    onClick={() => setFilePage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="text-sm font-bold text-slate-500 px-2">{filePage} / {Math.max(1, Math.ceil(selectedCat.files.length / 10))}</span>
                  <button
                    className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                    disabled={filePage >= Math.ceil(selectedCat.files.length / 10)}
                    onClick={() => setFilePage((p) => Math.min(Math.ceil(selectedCat.files.length / 10), p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={catDialog} onOpenChange={v => { if (!v) setCatDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Download Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Application Forms" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)} disabled={savingCat}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={savingCat}>
              {savingCat ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={fileDialog} onOpenChange={v => { if (!v) { setFileDialog(false); setFileUpload(null); setFileName(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!selectedCat && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select id="upload-cat-select" className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-blue-400 transition-colors text-center"
              onClick={() => fileRef.current?.click()}
            >
              {fileUpload ? (
                <div className="text-sm text-slate-700">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="font-medium">{fileUpload.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{(fileUpload.size / 1024).toFixed(0)} KB — Click to change</p>
                </div>
              ) : (
                <div className="text-slate-400">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Click to select any file (PDF, DOCX, XLSX, ZIP...)</p>
                  <p className="text-xs mt-1">Max 50 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
            <div className="space-y-1.5">
              <Label>Display Name (optional)</Label>
              <Input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Leave blank to use the original filename" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFileDialog(false); setFileUpload(null); setFileName(''); }} disabled={uploadingFile}>Cancel</Button>
            <Button onClick={handleUploadFile} disabled={uploadingFile || !fileUpload}>
              {uploadingFile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Category Modal */}
      <ConfirmDeleteModal
        open={!!deleteCatId}
        loading={deleting}
        title="Delete Category?"
        description="Are you sure you want to delete this category and ALL its files? This action cannot be undone."
        onConfirm={confirmDeleteCategory}
        onClose={() => setDeleteCatId(null)}
      />

      {/* Confirm Delete File Modal */}
      <ConfirmDeleteModal
        open={!!deleteFileId}
        loading={deleting}
        title="Delete File?"
        description="Are you sure you want to delete this file? This action cannot be undone."
        onConfirm={confirmDeleteFile}
        onClose={() => setDeleteFileId(null)}
      />
    </div>
  );
}
