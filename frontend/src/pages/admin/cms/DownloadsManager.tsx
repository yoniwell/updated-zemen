import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { adminFetch } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, AlertCircle, Upload, Search, Pencil, FolderOpen, FileText, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';

const BASE = getApiBaseUrl();

type DownloadFile = {
  id: string;
  name: string;
  fileSize: string;
  fileType: string;
  fileUrl: string;
  published: boolean;
  sortOrder: number;
  categoryId?: string;
  categoryName?: string;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  published: boolean;
  files: DownloadFile[];
};

const ITEMS_PER_PAGE = 10;

const authHeaders = () => {
  const token = localStorage.getItem('zemen_admin_token') || localStorage.getItem('adminToken');
  return { Authorization: `Bearer ${token}` };
};

export default function DownloadsManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'categories'>('files');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [filePage, setFilePage] = useState(1);
  const [catPage, setCatPage] = useState(1);

  // Category Add/Edit Dialog
  const [catDialog, setCatDialog] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: '', sortOrder: 0, published: true });
  const [savingCat, setSavingCat] = useState(false);

  // File Upload Dialog
  const [fileDialog, setFileDialog] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete Modals
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    } catch {
      toast.error('Failed to load download categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setFilePage(1);
    setCatPage(1);
  }, [search, catFilter]);

  // Flattened Files list for table view
  const allFiles = useMemo(() => {
    const list: Array<DownloadFile & { categoryName: string; categoryId: string }> = [];
    categories.forEach((cat) => {
      (cat.files || []).forEach((file) => {
        list.push({
          ...file,
          categoryId: cat.id,
          categoryName: cat.name,
        });
      });
    });
    return list;
  }, [categories]);

  const filteredFiles = useMemo(() => {
    return allFiles.filter((file) => {
      if (catFilter !== 'all' && file.categoryId !== catFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          file.name.toLowerCase().includes(q) ||
          file.categoryName.toLowerCase().includes(q) ||
          file.fileType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allFiles, catFilter, search]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, search]);

  const fileTotalPages = Math.max(1, Math.ceil(filteredFiles.length / ITEMS_PER_PAGE));
  const catTotalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));

  const paginatedFiles = useMemo(() => {
    const start = (filePage - 1) * ITEMS_PER_PAGE;
    return filteredFiles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFiles, filePage]);

  const paginatedCategories = useMemo(() => {
    const start = (catPage - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCategories, catPage]);

  // Category Dialog Handlers
  const openCreateCat = () => {
    setEditCatId(null);
    setCatForm({ name: '', sortOrder: 0, published: true });
    setCatDialog(true);
  };

  const openEditCat = (cat: Category) => {
    setEditCatId(cat.id);
    setCatForm({ name: cat.name, sortOrder: cat.sortOrder || 0, published: cat.published ?? true });
    setCatDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSavingCat(true);
    try {
      if (editCatId) {
        await adminFetch(`/api/downloads/categories/${editCatId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: catForm.name.trim(), sortOrder: catForm.sortOrder, published: catForm.published }),
        });
        toast.success('Category updated successfully');
      } else {
        await adminFetch('/api/downloads/categories', {
          method: 'POST',
          body: JSON.stringify({ name: catForm.name.trim(), sortOrder: catForm.sortOrder, published: catForm.published }),
        });
        toast.success('Category created successfully');
      }
      setCatDialog(false);
      load();
    } catch {
      toast.error('Failed to save category');
    } finally {
      setSavingCat(false);
    }
  };

  const toggleCategory = async (cat: Category) => {
    try {
      await adminFetch(`/api/downloads/categories/${cat.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: !cat.published }),
      });
      toast.success(`Category ${!cat.published ? 'published' : 'unpublished'}`);
      load();
    } catch {
      toast.error('Failed to update category');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatId) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/downloads/categories/${deleteCatId}`, { method: 'DELETE' });
      toast.success('Category deleted successfully');
      load();
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeleting(false);
      setDeleteCatId(null);
    }
  };

  // File Handlers
  const openUploadDialog = () => {
    setFileUpload(null);
    setFileName('');
    setSelectedCatId(categories[0]?.id || '');
    setFileDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileUpload(f);
    setFileName(f.name);
  };

  const handleUploadFile = async () => {
    if (!fileUpload) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!selectedCatId) {
      toast.error('Please select a category');
      return;
    }
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', fileUpload);
      fd.append('categoryId', selectedCatId);
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
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const toggleFile = async (file: DownloadFile) => {
    try {
      await adminFetch(`/api/downloads/files/${file.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: !file.published }),
      });
      toast.success(`File ${!file.published ? 'published' : 'unpublished'}`);
      load();
    } catch {
      toast.error('Failed to update file');
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* 1. Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Downloads & Application Forms</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage public document categories and downloadable application files</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCreateCat} className="flex items-center gap-1.5 font-bold shadow-sm">
            <Plus className="w-4 h-4" /> Add Category
          </Button>
          <Button onClick={openUploadDialog} disabled={categories.length === 0} className="flex items-center gap-1.5 font-bold shadow-sm bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4" /> Upload File
          </Button>
        </div>
      </div>

      {/* 2. Main Tabs Section */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'files' | 'categories')} className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl gap-1.5 inline-flex border border-slate-200/80 shadow-inner">
            <TabsTrigger
              value="files"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10"
            >
              <FileText className="h-4 w-4" />
              <span>Application & Download Files</span>
              <span className="ml-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
                {allFiles.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="categories"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/10"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Categories</span>
              <span className="ml-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
                {categories.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1 md:max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'files' ? 'Search files by name or type...' : 'Search categories...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white shadow-sm border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-xs"
              />
            </div>

            {activeTab === 'files' && (
              <select
                className="bg-white shadow-sm border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* TAB 1: FILES TABLE */}
        <TabsContent value="files" className="space-y-4 pt-2">
          {loading ? (
            <p className="rounded-md p-4 text-sm text-muted-foreground">Loading download files...</p>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold">File Name</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Size</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                          <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                            <AlertCircle className="w-6 h-6 mb-2 text-slate-300" />
                            <p className="text-sm font-medium">No files found.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedFiles.map((file) => (
                        <tr key={file.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 max-w-xs truncate">{file.name}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{file.categoryName}</td>
                          <td className="px-4 py-3 text-slate-500">
                            <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-xs font-mono font-bold text-slate-700">
                              {file.fileType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs font-medium">{file.fileSize}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleFile(file)} className="flex items-center gap-1">
                              {file.published ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                  <ToggleRight className="w-4 h-4" /> Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                                  <ToggleLeft className="w-4 h-4" /> Draft
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-6">
                              <button
                                onClick={() => setDeleteFileId(file.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete File"
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
                  Showing {filteredFiles.length === 0 ? 0 : (filePage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(filePage * ITEMS_PER_PAGE, filteredFiles.length)} of {filteredFiles.length}
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                    disabled={filePage <= 1}
                    onClick={() => setFilePage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="text-sm font-bold text-slate-500 px-2">{filePage} / {fileTotalPages}</span>
                  <button
                    className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                    disabled={filePage >= fileTotalPages}
                    onClick={() => setFilePage((p) => Math.min(fileTotalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CATEGORIES TABLE */}
        <TabsContent value="categories" className="space-y-4 pt-2">
          {loading ? (
            <p className="rounded-md p-4 text-sm text-muted-foreground">Loading categories...</p>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead className="bg-slate-900 text-white font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Category Name</th>
                      <th className="px-4 py-3 font-semibold">Files Count</th>
                      <th className="px-4 py-3 font-semibold">Sort Order</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                          <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                            <AlertCircle className="w-6 h-6 mb-2 text-slate-300" />
                            <p className="text-sm font-medium">No categories found.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedCategories.map((cat) => (
                        <tr key={cat.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => openEditCat(cat)}>
                          <td className="px-4 py-3 font-bold text-slate-900">{cat.name}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                              {(cat.files || []).length} files
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{cat.sortOrder || 0}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleCategory(cat)} className="flex items-center gap-1">
                              {cat.published ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                  <ToggleRight className="w-4 h-4" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                                  <ToggleLeft className="w-4 h-4" /> Hidden
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-6">
                              <button onClick={() => openEditCat(cat)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit Category">
                                <Pencil className="w-5 h-5" />
                              </button>
                              <button onClick={() => setDeleteCatId(cat.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Category">
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
                  Showing {filteredCategories.length === 0 ? 0 : (catPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(catPage * ITEMS_PER_PAGE, filteredCategories.length)} of {filteredCategories.length}
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                    disabled={catPage <= 1}
                    onClick={() => setCatPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="text-sm font-bold text-slate-500 px-2">{catPage} / {catTotalPages}</span>
                  <button
                    className="px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-slate-200 text-sm font-bold transition-colors text-slate-700 bg-white shadow-sm border border-slate-200"
                    disabled={catPage >= catTotalPages}
                    onClick={() => setCatPage((p) => Math.min(catTotalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Category Dialog */}
      <Dialog open={catDialog} onOpenChange={(v) => { if (!v) setCatDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCatId ? 'Edit Category' : 'Add Download Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Application Forms"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={catForm.sortOrder}
                onChange={(e) => setCatForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="cat-published"
                checked={catForm.published}
                onChange={(e) => setCatForm((f) => ({ ...f, published: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="cat-published" className="text-sm font-bold text-slate-700">
                Active (Visible on website)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)} disabled={savingCat}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={savingCat}>
              {savingCat ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : editCatId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={fileDialog} onOpenChange={(v) => { if (!v) { setFileDialog(false); setFileUpload(null); setFileName(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Target Category</Label>
              <select
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

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
                  <p className="text-sm font-medium">Click to select file (PDF, DOCX, XLSX, ZIP...)</p>
                  <p className="text-xs mt-1">Max file size: 50 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />

            <div className="space-y-1.5">
              <Label>Display Name (optional)</Label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Leave blank to use original filename"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFileDialog(false); setFileUpload(null); setFileName(''); }} disabled={uploadingFile}>
              Cancel
            </Button>
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
