import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  
  Newspaper,
  HelpCircle,
  Sparkles,
  PiggyBank,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CreditCard,
  Wallet,
  MapPin,
  Download,
  Phone,
  Search,
  Building2,
  // Megaphone removed (announcements hidden in admin)
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { useAdminI18n } from '@/lib/uiI18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DialogDescription } from '@/components/ui/dialog';

// Pages removed from CMS — page model handled server-side only if needed

type ServiceItem = {
  id: string;
  title: string;

  status: string;
  order: number;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaPath: string;
};

type LoanProduct = {
  id: string;
  name: string;
  purpose: string;
  suited: string;
  docs: string;
  status: string;
  maxAmount: string;
  interestRate: string;
  maxTerm: string;
  color: string;
  order: number;
};

type BranchItem = {
  id: string;
  name: string;
  city: string;
  phone: string;
  status: string;
  isHeadquarter: boolean;
  address: string;
  hours: string;
  mapUrl: string;
};

type DownloadCategory = {
  id: string;
  name: string;
  sortOrder: number;
  published: boolean;
};

type DownloadFile = {
  id: string;
  categoryId: string;
  name: string;
  size: string;
  type: string;
  link: string;
  sortOrder: number;
  published: boolean;
};

type DownloadItem = {
  id: string;
  categoryId: string;
  category: string;
  title: string;
  fileType: string;
  fileSize: string;
  status: string;
  fileName: string;
  sortOrder: number;
  link: string;
};

type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  status: string;
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: string;
  order: number;
};

// Announcements removed from admin UI (managed server-side)

const apiBaseUrl = getApiBaseUrl();
const resolveCmsAssetUrl = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${apiBaseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};
const NEWS_CATEGORIES = ['General', 'Meeting', 'Product Update', 'Branch Notice', 'Announcement'] as const;
const DOWNLOAD_FILE_TYPES = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'CSV', 'ZIP', 'JPG', 'JPEG', 'PNG'] as const;


const FAQ_CATEGORIES = ['General', 'Membership', 'Loans', 'Application', 'KYC', 'Digital Services'] as const;
// Announcement types/placements are not exposed in admin UI

const mergeCategoryOptions = (defaults: readonly string[], values: Array<string | null | undefined>): string[] =>
  Array.from(new Set([...defaults, ...values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))]));

const SectionHeader = ({
  title,
  count,
  onAdd,
  addLabel,
  search,
  onSearch,
  searchPlaceholder,
}: {
  title: string;
  count: number;
  onAdd?: () => void;
  addLabel?: string;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
}) => (
  <div className="flex items-center justify-between gap-3 border-b p-4">
    <div className="flex items-center gap-2">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </div>
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder || 'Search...'} className="h-8 w-52 pl-8 text-xs" />
      </div>
      {onAdd ? <Button size="sm" className="h-8" onClick={onAdd}><Plus className="mr-1 h-3.5 w-3.5" />{addLabel || 'Add'}</Button> : null}
    </div>
  </div>
);

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  cancelLabel,
  confirmLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
}) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{cancelLabel}</Button>
        <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default function ContentManager() {
  const { tAdmin } = useAdminI18n();
  const t = tAdmin;
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(true);

  // pages removed
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [savings, setSavings] = useState<ServiceItem[]>([]);
  const [loans, setLoans] = useState<LoanProduct[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [categories, setCategories] = useState<DownloadCategory[]>([]);
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  // searchPages removed
  const [searchServices, setSearchServices] = useState('');
  const [searchLoans, setSearchLoans] = useState('');
  const [searchBranches, setSearchBranches] = useState('');
  const [searchDownloads, setSearchDownloads] = useState('');
  const [searchNews, setSearchNews] = useState('');
  const [searchFaqs, setSearchFaqs] = useState('');
  // announcements removed from admin UI

  const [dialog, setDialog] = useState<{ open: boolean; type: string; editId: string | null }>({ open: false, type: '', editId: null });
  const [confirm, setConfirm] = useState<{ open: boolean; type: string; id: string }>({ open: false, type: '', id: '' });

  // formPage removed
  const [formService, setFormService] = useState<Partial<ServiceItem>>({});
  const [formLoan, setFormLoan] = useState<Partial<LoanProduct>>({});
  const [formBranch, setFormBranch] = useState<Partial<BranchItem>>({});
  const [formDownload, setFormDownload] = useState<Partial<DownloadItem>>({});
  const [formNews, setFormNews] = useState<Partial<NewsItem>>({});
  const [formFaq, setFormFaq] = useState<Partial<FaqItem>>({});
  // announcement form removed
  const [downloadUploadFile, setDownloadUploadFile] = useState<File | null>(null);
  const [newsUploadFile, setNewsUploadFile] = useState<File | null>(null);
  const [dialogInnerTab, setDialogInnerTab] = useState<'details' | 'publish'>('details');

  const newsUploadPreviewUrl = useMemo(() => {
    if (!newsUploadFile) return '';
    return URL.createObjectURL(newsUploadFile);
  }, [newsUploadFile]);

  useEffect(() => {
    return () => {
      if (newsUploadPreviewUrl) {
        URL.revokeObjectURL(newsUploadPreviewUrl);
      }
    };
  }, [newsUploadPreviewUrl]);

  const formatUploadSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const downloads = useMemo<DownloadItem[]>(() => {
    const byId = new Map(categories.map((c) => [c.id, c.name]));
    return downloadFiles.map((file) => ({
      id: file.id,
      categoryId: file.categoryId,
      category: byId.get(file.categoryId) || t('adminCmsUncategorized', 'Uncategorized'),
      title: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: file.published ? 'PUBLISHED' : 'DRAFT',
      fileName: file.name,
      sortOrder: file.sortOrder,
      link: file.link,
    }));
  }, [categories, downloadFiles, t]);

  const dedupedDownloadCategoryOptions = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((category) => {
      const key = category.name.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);

  const newsCategoryOptions = useMemo(
    () => mergeCategoryOptions(NEWS_CATEGORIES, [...news.map((item) => item.category), formNews.category]),
    [formNews.category, news],
  );

  const faqCategoryOptions = useMemo(
    () => mergeCategoryOptions(FAQ_CATEGORIES, [...faqs.map((item) => item.category), formFaq.category]),
    [faqs, formFaq.category],
  );

  const filt = <T extends Record<string, unknown>>(arr: T[], q: string, keys: (keyof T)[]) => {
    if (!q.trim()) return arr;
    const needle = q.toLowerCase();
    return arr.filter((item) => keys.some((k) => String(item[k] ?? '').toLowerCase().includes(needle)));
  };

  const loadCms = useCallback(async () => {
    setLoading(true);
    const fetchBranches = async (fields: string[]) => {
      const query = fields.length ? `?fields=${fields.join(',')}` : '';
      return adminFetch<{ branches: Array<{ id: string; name: string; location?: string; phonePrimary?: string; published: boolean;officeHours?: string;
      mapUrl?: string;  }> }>(`/api/admin/content/branches${query}`);
    };

    const results = await Promise.allSettled([
      adminFetch<{ services: Array<{ id: string; title: string; description: string; features: unknown; ctaLabel: string | null; ctaPath: string | null; sortOrder: number; status: string }> }>('/api/admin/content/services'),
      adminFetch<{ savings: Array<{ id: string; title: string; description: string; features: unknown; ctaLabel: string | null; ctaPath: string | null; sortOrder: number; status: string }> }>('/api/admin/content/savings'),
      adminFetch<{ loanProducts: Array<{ id: string; name: string; purpose: string; suited: string; docs: string; status: string; maxAmount: string; interestRate: string; maxTerm: string; color: string; sortOrder: number }> }>('/api/admin/content/loan-products'),
      fetchBranches(['id', 'name', 'location', 'phonePrimary', 'published']),
      adminFetch<{ categories: DownloadCategory[] }>('/api/admin/content/downloads/categories'),
      adminFetch<{ files: DownloadFile[] }>('/api/admin/content/downloads/files'),
      adminFetch<{ news: Array<{ id: string; title: string; excerpt: string; content: string | null; imageUrl: string | null; category: string; status: string }> }>('/api/admin/content/news'),
      adminFetch<{ faqs: Array<{ id: string; question: string; answer: string; category: string; published: boolean }> }>('/api/admin/content/faqs'),
      // announcements not loaded in admin UI
    ]);
    const [servicesRes, savingsRes, loansRes, branchesRes, catRes, filesRes, newsRes, faqRes] = results;
    if (servicesRes.status === 'fulfilled') {
      setServices(servicesRes.value.services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        features: Array.isArray(s.features) ? s.features.filter((v): v is string => typeof v === 'string') : [],
        ctaLabel: s.ctaLabel || '',
        ctaPath: s.ctaPath || '',
        order: s.sortOrder,
        status: s.status,
      })));
    }
    if (savingsRes && savingsRes.status === 'fulfilled') {
      setSavings(savingsRes.value.savings.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        features: Array.isArray(s.features) ? s.features.filter((v): v is string => typeof v === 'string') : [],
        ctaLabel: s.ctaLabel || '',
        ctaPath: s.ctaPath || '',
        order: s.sortOrder,
        status: s.status,
      })));
    }
    if (loansRes.status === 'fulfilled') {
      setLoans(loansRes.value.loanProducts.map((l) => ({ ...l, order: l.sortOrder })));
    }
    if (branchesRes.status === 'fulfilled') {
      setBranches(branchesRes.value.branches.map((b) => ({
        id: b.id,
        name: b.name,
        city: b.location ?? '',
        phone: b.phonePrimary ?? '',
        status: b.published ? 'Active' : 'Inactive',
        isHeadquarter: /head|hq/i.test(b.name),
        address: b.location ?? '',
        hours: b.officeHours ?? '',
        mapUrl: b.mapUrl ?? '',
      })));
    }
    if (catRes.status === 'fulfilled') setCategories(catRes.value.categories);
    if (filesRes.status === 'fulfilled') setDownloadFiles(filesRes.value.files);
    if (newsRes.status === 'fulfilled') {
      setNews(newsRes.value.news.map((item) => ({
        ...item,
        content: item.content || '',
        imageUrl: item.imageUrl || '',
      })));
    }
    if (faqRes.status === 'fulfilled') setFaqs(faqRes.value.faqs.map((f, idx) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category, status: f.published ? 'PUBLISHED' : 'DRAFT', order: idx + 1 })));
    // announcements intentionally not set or managed here

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) toast.info(t('adminCmsModulesLoadPartial', 'Some modules could not load yet. Run latest backend migration if needed.'));
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void loadCms();
  }, [loadCms]);

  useEffect(() => {
    if (dialog.open) setDialogInnerTab('details');
  }, [dialog.open, dialog.type, dialog.editId]);

  useEffect(() => {
    if (!dialog.open || dialog.type !== 'download' || dialog.editId || formDownload.categoryId || categories.length === 0) {
      return;
    }

    setFormDownload((current) => (current.categoryId ? current : { ...current, categoryId: categories[0].id }));
  }, [categories, dialog.editId, dialog.open, dialog.type, formDownload.categoryId]);

  const openCreate = (type: string,) => {
    if (type === 'service') setFormService({ title: '', description: '', features: [], ctaLabel: '', ctaPath: '', order: services.length + 1, status: 'DRAFT' });
    if (type === 'saving') setFormService({ title: '', description: '', features: [], ctaLabel: '', ctaPath: '', order: savings.length + 1, status: 'DRAFT' });
    if (type === 'loan') setFormLoan({ name: '', purpose: '', suited: '', docs: '', maxAmount: '', interestRate: '', maxTerm: '', color: 'border-l-primary', order: loans.length + 1, status: 'DRAFT' });
    if (type === 'branch') setFormBranch({ name: '', city: '', address: '', phone: '', mapUrl: '', hours: 'Mon-Fri 8:30 AM - 5:30 PM', status: 'Active', isHeadquarter: false });
    if (type === 'download') {
      
      setFormDownload({ title: '', categoryId: categories[0]?.id || '', fileType: 'PDF', fileSize: '', fileName: '', link: '', status: 'DRAFT', sortOrder: downloads.length + 1 });
      setDownloadUploadFile(null);
    }
    if (type === 'news') {
      setFormNews({ title: '', excerpt: '', content: '', imageUrl: '', category: 'General', status: 'PUBLISHED' });
      setNewsUploadFile(null);
    }
    if (type === 'faq') setFormFaq({ question: '', answer: '', category: 'General', status: 'DRAFT', order: faqs.length + 1 });
    // announcement creation removed from admin UI
    setDialog({ open: true, type, editId: null });
  };

  const openEdit = (type: string, id: string) => {
    if (type === 'service') {
      const current = services.find((x) => x.id === id) ?? {} as Partial<ServiceItem>;
      setFormService({ ...current });
    }
    if (type === 'saving') {
      const current = savings.find((x) => x.id === id) ?? {} as Partial<ServiceItem>;
      setFormService({ ...current });
    }
    if (type === 'loan') {
      const current = loans.find((x) => x.id === id) ?? {} as Partial<LoanProduct>;
      setFormLoan({ ...current });
    }
    if (type === 'branch') {
      const current = branches.find((x) => x.id === id) ?? {} as Partial<BranchItem>;
      setFormBranch({ ...current });
    }
    if (type === 'download') {
      const current = downloads.find((x) => x.id === id) ?? {} as Partial<DownloadItem>;
      setFormDownload({ ...current, categoryId: (current as DownloadItem).categoryId || categories[0]?.id || '' });
      setDownloadUploadFile(null);
    }
    if (type === 'news') {
      const current = news.find((x) => x.id === id) ?? {} as Partial<NewsItem>;
      setFormNews({ ...current, category: (current as NewsItem).category || 'General' });
      setNewsUploadFile(null);
    }
    if (type === 'faq') {
      const current = faqs.find((x) => x.id === id) ?? {} as Partial<FaqItem>;
      setFormFaq({ ...current, category: (current as FaqItem).category || 'General' });
    }
    // announcement editing removed from admin UI
    setDialog({ open: true, type, editId: id });
  };

  const closeDialog = () => {
    setDownloadUploadFile(null);
    setNewsUploadFile(null);
    setDialogInnerTab('details');
    setDialog({ open: false, type: '', editId: null });
  };

  const renderPublishingControls = () => {
    if (dialog.type === 'service') {
      return <div className="flex items-center gap-2"><Switch checked={(formService.status || 'DRAFT') === 'PUBLISHED'} onCheckedChange={(v) => setFormService({ ...formService, status: v ? 'PUBLISHED' : 'DRAFT' })} /><Label>{t('adminPublished', 'Published')}</Label></div>;
    }
    if (dialog.type === 'loan') {
      return <div className="flex items-center gap-2"><Switch checked={(formLoan.status || 'DRAFT') === 'PUBLISHED'} onCheckedChange={(v) => setFormLoan({ ...formLoan, status: v ? 'PUBLISHED' : 'DRAFT' })} /><Label>{t('adminPublished', 'Published')}</Label></div>;
    }
    if (dialog.type === 'branch') {
      return <div className="flex items-center gap-2"><Switch checked={(formBranch.status || 'Active') === 'Active'} onCheckedChange={(v) => setFormBranch({ ...formBranch, status: v ? 'Active' : 'Inactive' })} /><Label>{t('adminActive', 'Active')}</Label></div>;
    }
    if (dialog.type === 'download') {
      return <div className="flex items-center gap-2"><Switch checked={(formDownload.status || 'DRAFT') === 'PUBLISHED'} onCheckedChange={(v) => setFormDownload({ ...formDownload, status: v ? 'PUBLISHED' : 'DRAFT' })} /><Label>{t('adminPublished', 'Published')}</Label></div>;
    }
    if (dialog.type === 'news') {
      return <div className="flex items-center gap-2"><Switch checked={(formNews.status || 'PUBLISHED') === 'PUBLISHED'} onCheckedChange={(v) => setFormNews({ ...formNews, status: v ? 'PUBLISHED' : 'DRAFT' })} /><Label>{t('adminPublished', 'Published')}</Label></div>;
    }
    if (dialog.type === 'faq') {
      return <div className="flex items-center gap-2"><Switch checked={(formFaq.status || 'DRAFT') === 'PUBLISHED'} onCheckedChange={(v) => setFormFaq({ ...formFaq, status: v ? 'PUBLISHED' : 'DRAFT' })} /><Label>{t('adminPublished', 'Published')}</Label></div>;
    }
    // publishing controls for announcements removed
    return null;
  };

  const saveItem = async () => {
    try {
      

      if (dialog.type === 'service') {
        if (!formService.title?.trim() || !formService.description?.trim()) return toast.error(t('adminCmsTitleDescriptionRequired', 'Title and description are required'));
        const currentService = services.find((item) => item.id === dialog.editId);
        const payload = {
          title: formService.title.trim(),
          description: formService.description.trim(),
          features: (formService.features || []).map((value) => value.trim()).filter(Boolean),
          sortOrder: Number(formService.order ?? currentService?.order ?? services.length + 1),
          status: formService.status || 'DRAFT',
        };
        if (dialog.editId) await adminFetch(`/api/admin/content/services/${dialog.editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await adminFetch('/api/admin/content/services', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (dialog.type === 'saving') {
        if (!formService.title?.trim() || !formService.description?.trim()) return toast.error(t('adminCmsTitleDescriptionRequired', 'Title and description are required'));
        const currentSaving = savings.find((item) => item.id === dialog.editId);
        const payload = {
          title: formService.title.trim(),
          description: formService.description.trim(),
          features: (formService.features || []).map((value) => value.trim()).filter(Boolean),
          sortOrder: Number(formService.order ?? currentSaving?.order ?? savings.length + 1),
          status: formService.status || 'DRAFT',
        };
        if (dialog.editId) await adminFetch(`/api/admin/content/savings/${dialog.editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await adminFetch('/api/admin/content/savings', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (dialog.type === 'loan') {
        if (!formLoan.name?.trim()) return toast.error(t('adminCmsNameRequired', 'Name is required'));
        const payload = {
          name: formLoan.name || '', purpose: formLoan.purpose || '', suited: formLoan.suited || '', docs: formLoan.docs || '',
          status: formLoan.status || 'DRAFT', maxAmount: formLoan.maxAmount || '', interestRate: formLoan.interestRate || '', maxTerm: formLoan.maxTerm || '',
          color: formLoan.color || 'border-l-primary', sortOrder: Number(formLoan.order || 0),
        };
        if (dialog.editId) await adminFetch(`/api/admin/content/loan-products/${dialog.editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await adminFetch('/api/admin/content/loan-products', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (dialog.type === 'branch') {
        if (!formBranch.name?.trim() || !formBranch.address?.trim()) return toast.error(t('adminCmsNameAddressRequired', 'Name and address are required'));
        const payload = {
          name: formBranch.name.trim(),
          location: formBranch.address.trim(),
          officeHours: formBranch.hours || '',
          mapUrl: formBranch.mapUrl || '#',
          phonePrimary: formBranch.phone || '',
          published: (formBranch.status || 'Active') === 'Active',
        };
        if (dialog.editId) await adminFetch(`/api/admin/content/branches/${dialog.editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await adminFetch('/api/admin/content/branches', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (dialog.type === 'download') {
        if (!formDownload.title?.trim() || !formDownload.categoryId) return toast.error(t('adminCmsTitleCategoryRequired', 'Title and category are required'));
        if (!dialog.editId && !downloadUploadFile && !formDownload.link?.trim()) return toast.error(t('adminCmsUploadOrLinkRequired', 'Upload a file or provide a manual link'));
        const published = (formDownload.status || 'DRAFT') === 'PUBLISHED';

        if (downloadUploadFile) {
          const formData = new FormData();
          formData.append('file', downloadUploadFile);
          formData.append('categoryId', formDownload.categoryId);
          formData.append('name', formDownload.title.trim());
          formData.append('sortOrder', String(Number(formDownload.sortOrder || 0)));
          formData.append('published', String(published));

          if (dialog.editId) {
            await adminFetch(`/api/admin/content/downloads/files/${dialog.editId}/upload`, { method: 'POST', body: formData });
          } else {
            await adminFetch('/api/admin/content/downloads/files/upload', { method: 'POST', body: formData });
          }
        } else {
          const payload = {
            categoryId: formDownload.categoryId,
            name: formDownload.title.trim(),
            size: formDownload.fileSize || '0 KB',
            type: formDownload.fileType || 'PDF',
            link: formDownload.link?.trim() || '#',
            sortOrder: Number(formDownload.sortOrder || 0),
            published,
          };
          if (dialog.editId) await adminFetch(`/api/admin/content/downloads/files/${dialog.editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
          else await adminFetch('/api/admin/content/downloads/files', { method: 'POST', body: JSON.stringify(payload) });
        }
      }

      if (dialog.type === 'news') {
        if (!formNews.title?.trim() || !formNews.excerpt?.trim()) return toast.error(t('adminCmsTitleExcerptRequired', 'Title and excerpt are required'));
        let imageUrl = formNews.imageUrl?.trim() || '';

        if (newsUploadFile) {
          const uploadData = new FormData();
          uploadData.append('image', newsUploadFile);
          const uploadResult = await adminFetch<{ imageUrl: string }>('/api/admin/content/news/upload-image', { method: 'POST', body: uploadData });
          imageUrl = uploadResult.imageUrl;
        }

        const payload = {
          title: formNews.title.trim(),
          excerpt: formNews.excerpt.trim(),
          content: formNews.content?.trim() || null,
          imageUrl: imageUrl || null,
          category: formNews.category || 'General',
          status: formNews.status || 'PUBLISHED',
        };
        if (dialog.editId) await adminFetch(`/api/admin/content/news/${dialog.editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await adminFetch('/api/admin/content/news', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (dialog.type === 'faq') {
        if (!formFaq.question?.trim() || !formFaq.answer?.trim()) return toast.error(t('adminCmsQuestionAnswerRequired', 'Question and answer are required'));
        const payload = { question: formFaq.question.trim(), answer: formFaq.answer.trim(), category: formFaq.category || 'General', published: (formFaq.status || 'DRAFT') === 'PUBLISHED' };
        if (dialog.editId) await adminFetch(`/api/admin/content/faqs/${dialog.editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await adminFetch('/api/admin/content/faqs', { method: 'POST', body: JSON.stringify(payload) });
      }

      // announcement save removed from admin UI

      toast.success(dialog.editId ? t('adminCmsUpdatedSuccessfully', 'Updated successfully') : t('adminCmsCreatedSuccessfully', 'Created successfully'));
      closeDialog();
      await loadCms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('adminCmsSaveFailed', 'Save failed'));
    }
  };

  const handleDelete = async () => {
    try {
      
      if (confirm.type === 'service') await adminFetch(`/api/admin/content/services/${confirm.id}`, { method: 'DELETE' });
      if (confirm.type === 'loan') await adminFetch(`/api/admin/content/loan-products/${confirm.id}`, { method: 'DELETE' });
      if (confirm.type === 'branch') await adminFetch(`/api/admin/content/branches/${confirm.id}`, { method: 'DELETE' });
      if (confirm.type === 'download') await adminFetch(`/api/admin/content/downloads/files/${confirm.id}`, { method: 'DELETE' });
      if (confirm.type === 'news') await adminFetch(`/api/admin/content/news/${confirm.id}`, { method: 'DELETE' });
      if (confirm.type === 'faq') await adminFetch(`/api/admin/content/faqs/${confirm.id}`, { method: 'DELETE' });
      if (confirm.type === 'saving') await adminFetch(`/api/admin/content/savings/${confirm.id}`, { method: 'DELETE' });
      // announcement delete handled outside admin UI
      setConfirm({ open: false, type: '', id: '' });
      toast.success(t('adminCmsItemDeleted', 'Item deleted'));
      await loadCms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('adminCmsDeleteFailed', 'Delete failed'));
    }
  };

  const toggleStatus = async (type: string, id: string, status: string) => {
    try {
      
      if (type === 'service') await adminFetch(`/api/admin/content/services/${id}`, { method: 'PATCH', body: JSON.stringify({ status: status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }) });
      if (type === 'saving') await adminFetch(`/api/admin/content/savings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }) });
      if (type === 'loan') await adminFetch(`/api/admin/content/loan-products/${id}`, { method: 'PATCH', body: JSON.stringify({ status: status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }) });
      if (type === 'branch') await adminFetch(`/api/admin/content/branches/${id}`, { method: 'PATCH', body: JSON.stringify({ published: status !== 'Active' }) });
      if (type === 'download') await adminFetch(`/api/admin/content/downloads/files/${id}`, { method: 'PATCH', body: JSON.stringify({ published: status !== 'PUBLISHED' }) });
      if (type === 'news') await adminFetch(`/api/admin/content/news/${id}`, { method: 'PATCH', body: JSON.stringify({ status: status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }) });
      if (type === 'faq') await adminFetch(`/api/admin/content/faqs/${id}`, { method: 'PATCH', body: JSON.stringify({ published: status !== 'PUBLISHED' }) });
      // announcement status toggles removed from admin UI
      toast.success(t('adminCmsStatusUpdated', 'Status updated'));
      await loadCms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('adminCmsStatusUpdateFailed', 'Status update failed'));
    }
  };

  if (loading) return <p className="rounded-lg bg-white p-4 text-sm text-slate-600">{tAdmin('loadingCms', 'Loading CMS...')}</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-foreground">{tAdmin('contentManagement', 'Content Management')}</h1>
        <p className="text-sm text-muted-foreground">{tAdmin('contentManagementSubheading', 'Manage services, loan products, branches, downloads, news, and FAQs.')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 p-1">
        
          <TabsTrigger value="services" className="text-xs"><Wallet className="mr-1 h-3.5 w-3.5" />{tAdmin('services', 'Services')}</TabsTrigger>
          <TabsTrigger value="savings" className="text-xs"><PiggyBank className="mr-1 h-3.5 w-3.5" />{tAdmin('savings', 'Savings')}</TabsTrigger>
          <TabsTrigger value="loans" className="text-xs"><CreditCard className="mr-1 h-3.5 w-3.5" />{tAdmin('loanProducts', 'Loan Products')}</TabsTrigger>
          <TabsTrigger value="branches" className="text-xs"><MapPin className="mr-1 h-3.5 w-3.5" />{tAdmin('branches', 'Branches')}</TabsTrigger>
          <TabsTrigger value="downloads" className="text-xs"><Download className="mr-1 h-3.5 w-3.5" />{tAdmin('downloads', 'Downloads')}</TabsTrigger>
          <TabsTrigger value="news" className="text-xs"><Newspaper className="mr-1 h-3.5 w-3.5" />{tAdmin('news', 'News')}</TabsTrigger>
          <TabsTrigger value="faqs" className="text-xs"><HelpCircle className="mr-1 h-3.5 w-3.5" />{tAdmin('faqs', 'FAQs')}</TabsTrigger>
          {/* Announcements removed from admin UI */}
        </TabsList>

        

        <TabsContent value="services">
          <div className="rounded-xl border bg-card">
            <SectionHeader title={tAdmin('serviceProducts', 'Service Products')} count={services.length} onAdd={() => openCreate('service')} addLabel={tAdmin('addService', 'Add Service')} search={searchServices} onSearch={setSearchServices} searchPlaceholder={tAdmin('search', 'Search...')} />
            <div className="divide-y">
              {filt(services, searchServices, ['title', 'description']).map((item) => (
                <div key={item.id} className="flex items-start justify-between p-4 hover:bg-muted/30 cursor-pointer" onClick={() => openEdit('service', item.id)}>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{tAdmin('order', 'Order')} {item.order}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit('service', item.id); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void toggleStatus('service', item.id, item.status); }}>{item.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, type: 'service', id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="savings">
          <div className="rounded-xl border bg-card">
            <SectionHeader title={tAdmin('savingsProducts', 'Savings Products')} count={savings.length} onAdd={() => openCreate('saving')} addLabel={tAdmin('addSaving', 'Add Saving')} search={searchServices} onSearch={setSearchServices} searchPlaceholder={tAdmin('search', 'Search...')} />
            <div className="divide-y">
              {filt(savings, searchServices, ['title', 'description']).map((item) => (
                <div key={item.id} className="flex items-start justify-between p-4 hover:bg-muted/30 cursor-pointer" onClick={() => openEdit('saving', item.id)}>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{tAdmin('order', 'Order')} {item.order}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit('saving', item.id); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void toggleStatus('saving', item.id, item.status); }}>{item.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, type: 'saving', id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="loans"><div className="rounded-xl border bg-card"><SectionHeader title={t('adminCmsLoanProductsTitle', 'Loan Products')} count={loans.length} onAdd={() => openCreate('loan')} addLabel={t('adminCmsAddProduct', 'Add Product')} search={searchLoans} onSearch={setSearchLoans} searchPlaceholder={t('adminSearch', 'Search...')} /><div className="divide-y">{filt(loans, searchLoans, ['name', 'purpose', 'suited']).map((item) => (<div key={item.id} className="flex items-start justify-between p-4 hover:bg-muted/30 cursor-pointer" onClick={() => openEdit('loan', item.id)}><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{t('adminCmsMaxLabel', 'Max')} {item.maxAmount} · {t('adminCmsRateLabel', 'Rate')} {item.interestRate} · {t('adminCmsTermLabel', 'Term')} {item.maxTerm}</p><p className="mt-1 text-xs text-muted-foreground">{item.purpose}</p></div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit('loan', item.id); }}><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void toggleStatus('loan', item.id, item.status); }}>{item.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, type: 'loan', id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></div></TabsContent>
        <TabsContent value="branches"><div className="rounded-xl border bg-card"><SectionHeader title={t('adminCmsBranchLocationsTitle', 'Branch Locations')} count={branches.length} onAdd={() => openCreate('branch')} addLabel={t('adminCmsAddBranch', 'Add Branch')} search={searchBranches} onSearch={setSearchBranches} searchPlaceholder={t('adminSearch', 'Search...')} /><div className="divide-y">{filt(branches, searchBranches, ['name', 'city', 'address']).map((item) => (<div key={item.id} className="flex items-start justify-between p-4 hover:bg-muted/30 cursor-pointer" onClick={() => openEdit('branch', item.id)}><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg ${item.isHeadquarter ? 'bg-warning/10' : 'bg-primary/10'}`}>{item.isHeadquarter ? <Building2 className="h-5 w-5 text-warning" /> : <MapPin className="h-5 w-5 text-primary" />}</div><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.address}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{item.phone}</p></div></div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit('branch', item.id); }}><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void toggleStatus('branch', item.id, item.status); }}>{item.status === 'Active' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, type: 'branch', id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></div></TabsContent>
        <TabsContent value="downloads"><div className="rounded-xl border bg-card"><SectionHeader title={t('adminCmsDownloadableResourcesTitle', 'Downloadable Resources')} count={downloads.length} onAdd={() => openCreate('download')} addLabel={t('adminCmsAddFile', 'Add File')} search={searchDownloads} onSearch={setSearchDownloads} searchPlaceholder={t('adminSearch', 'Search...')} /><div className="divide-y">{filt(downloads, searchDownloads, ['title', 'category']).map((item) => (<div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer" onClick={() => openEdit('download', item.id)}><div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.category} · {item.fileType} · {item.fileSize}</p></div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit('download', item.id); }}><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void toggleStatus('download', item.id, item.status); }}>{item.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, type: 'download', id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></div></TabsContent>
        <TabsContent value="news"><div className="rounded-xl border bg-card"><SectionHeader title={t('adminCmsNewsArticlesTitle', 'News Articles')} count={news.length} onAdd={() => openCreate('news')} addLabel={t('adminCmsNewArticle', 'New Article')} search={searchNews} onSearch={setSearchNews} searchPlaceholder={t('adminSearch', 'Search...')} /><div className="divide-y">{filt(news, searchNews, ['title', 'excerpt', 'category']).map((item) => (<div key={item.id} className="flex items-start justify-between p-4 hover:bg-muted/30 cursor-pointer" onClick={() => openEdit('news', item.id)}><div className="flex items-start gap-3">{item.imageUrl ? <img src={resolveCmsAssetUrl(item.imageUrl)} alt={item.title} className="h-16 w-24 rounded-md border object-cover" /> : null}<div><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.category}</p><p className="mt-1 text-xs text-muted-foreground">{item.excerpt}</p></div></div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit('news', item.id); }}><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void toggleStatus('news', item.id, item.status); }}>{item.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, type: 'news', id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></div></TabsContent>
        <TabsContent value="faqs"><div className="rounded-xl border bg-card"><SectionHeader title={t('adminCmsFaqItemsTitle', 'FAQ Items')} count={faqs.length} onAdd={() => openCreate('faq')} addLabel={t('adminCmsAddFaq', 'Add FAQ')} search={searchFaqs} onSearch={setSearchFaqs} searchPlaceholder={t('adminSearch', 'Search...')} /><div className="divide-y">{filt(faqs, searchFaqs, ['question', 'answer', 'category']).map((item) => (<div key={item.id} className="flex items-start justify-between p-4 hover:bg-muted/30 cursor-pointer" onClick={() => openEdit('faq', item.id)}><div><p className="text-sm font-medium">{item.question}</p><p className="text-xs text-muted-foreground">{item.answer}</p></div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit('faq', item.id); }}><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void toggleStatus('faq', item.id, item.status); }}>{item.status === 'PUBLISHED' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, type: 'faq', id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>))}</div></div></TabsContent>
        {/* Announcements removed from admin UI */}
      </Tabs>

      <Dialog open={dialog.open} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="content-manager-dialog max-h-[92vh] max-w-4xl overflow-y-auto bg-white p-0 shadow-2xl">
          <DialogHeader>
            <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 text-white">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                <Sparkles className="h-3.5 w-3.5" />
                {t('adminCmsEditor', 'CMS Editor')}
              </div>
              <DialogTitle className="text-white">{dialog.editId ? t('adminEdit', 'Edit') : t('adminCreate', 'Create')} {dialog.type}</DialogTitle>
              <DialogDescription className="text-slate-200">{t('adminCmsFillFormAndSave', 'Fill the form and save.')}</DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-6 pb-6 pt-4">
            <Tabs value={dialogInnerTab} onValueChange={(value) => setDialogInnerTab(value as 'details' | 'publish')} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 rounded-lg border border-slate-300 bg-slate-100 p-1">
                <TabsTrigger value="details" className="text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">{t('adminDetails', 'Details')}</TabsTrigger>
                <TabsTrigger value="publish" className="text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">{t('adminPublishing', 'Publishing')}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 rounded-xl bg-white p-4">

          

          {dialog.type === 'service' ? (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>{t('adminTitle', 'Title')}</Label><Input placeholder="e.g. Salary Advance Service" value={formService.title || ''} onChange={(e) => setFormService({ ...formService, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t('adminDescription', 'Description')}</Label><Textarea placeholder="e.g. Fast short-term financing for salaried members." value={formService.description || ''} onChange={(e) => setFormService({ ...formService, description: e.target.value })} rows={3} /></div>
              <div className="space-y-1.5"><Label>{t('adminCmsFeaturesOnePerLine', 'Features (one per line)')}</Label><Textarea placeholder={"e.g. Up to ETB 150,000\nApproval in 48 hours"} value={(formService.features || []).join('\n')} onChange={(e) => setFormService({ ...formService, features: e.target.value.split('\n') })} rows={4} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>{t('adminOrder', 'Order')}</Label><Input type="number" min="1" value={formService.order ?? ''} onChange={(e) => setFormService({ ...formService, order: Number(e.target.value) })} /></div>
              </div>
            </div>
          ) : null}

          {dialog.type === 'saving' ? (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>{t('adminTitle', 'Title')}</Label><Input placeholder="e.g. Regular Compulsory Savings" value={formService.title || ''} onChange={(e) => setFormService({ ...formService, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t('adminDescription', 'Description')}</Label><Textarea placeholder="e.g. The foundation of your SACCO membership." value={formService.description || ''} onChange={(e) => setFormService({ ...formService, description: e.target.value })} rows={3} /></div>
              <div className="space-y-1.5"><Label>{t('adminCmsFeaturesOnePerLine', 'Features (one per line)')}</Label><Textarea placeholder={"e.g. Minimum ETB 500/month\nEarns annual dividends"} value={(formService.features || []).join('\n')} onChange={(e) => setFormService({ ...formService, features: e.target.value.split('\n') })} rows={4} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>{t('adminOrder', 'Order')}</Label><Input type="number" min="1" value={formService.order ?? ''} onChange={(e) => setFormService({ ...formService, order: Number(e.target.value) })} /></div>
              </div>
            </div>
          ) : null}

          {dialog.type === 'loan' ? (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>{t('adminName', 'Name')}</Label><Input placeholder="e.g. SME Growth Loan" value={formLoan.name || ''} onChange={(e) => setFormLoan({ ...formLoan, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t('adminPurpose', 'Purpose')}</Label><Textarea placeholder="e.g. Working capital for small business expansion." value={formLoan.purpose || ''} onChange={(e) => setFormLoan({ ...formLoan, purpose: e.target.value })} rows={2} /></div>
              <div className="space-y-1.5"><Label>{t('adminCmsSuitedFor', 'Suited For')}</Label><Input placeholder="e.g. Small business owners" value={formLoan.suited || ''} onChange={(e) => setFormLoan({ ...formLoan, suited: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4"><div className="space-y-1.5"><Label>{t('adminCmsMaxAmount', 'Max Amount')}</Label><Input placeholder="e.g. ETB 2,000,000" value={formLoan.maxAmount || ''} onChange={(e) => setFormLoan({ ...formLoan, maxAmount: e.target.value })} /></div><div className="space-y-1.5"><Label>{t('adminInterest', 'Interest')}</Label><Input placeholder="e.g. 16% per annum" value={formLoan.interestRate || ''} onChange={(e) => setFormLoan({ ...formLoan, interestRate: e.target.value })} /></div><div className="space-y-1.5"><Label>{t('adminCmsMaxTerm', 'Max Term')}</Label><Input placeholder="e.g. 60 months" value={formLoan.maxTerm || ''} onChange={(e) => setFormLoan({ ...formLoan, maxTerm: e.target.value })} /></div></div>
              <div className="space-y-1.5"><Label>{t('adminDocuments', 'Documents')}</Label><Textarea placeholder="e.g. National ID, bank statements, business license" value={formLoan.docs || ''} onChange={(e) => setFormLoan({ ...formLoan, docs: e.target.value })} rows={2} /></div>
            </div>
          ) : null}

          {dialog.type === 'branch' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>{t('adminName', 'Name')}</Label><Input placeholder="e.g. Bole Branch" value={formBranch.name || ''} onChange={(e) => setFormBranch({ ...formBranch, name: e.target.value })} /></div><div className="space-y-1.5"><Label>{t('adminCity', 'City')}</Label><Input placeholder="e.g. Addis Ababa" value={formBranch.city || ''} onChange={(e) => setFormBranch({ ...formBranch, city: e.target.value })} /></div></div>
              <div className="space-y-1.5"><Label>{t('adminAddress', 'Address')}</Label><Textarea placeholder="e.g. Africa Avenue, near Edna Mall" value={formBranch.address || ''} onChange={(e) => setFormBranch({ ...formBranch, address: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>{t('adminPhone', 'Phone')}</Label><Input placeholder="e.g. +251115551234" value={formBranch.phone || ''} onChange={(e) => setFormBranch({ ...formBranch, phone: e.target.value })} /></div><div className="space-y-1.5"><Label>{t('adminMapUrl', 'Map URL')}</Label><Input placeholder="e.g. https://maps.google.com/..." value={formBranch.mapUrl || ''} onChange={(e) => setFormBranch({ ...formBranch, mapUrl: e.target.value })} /></div></div>
              <div className="space-y-1.5"><Label>{t('adminHours', 'Hours')}</Label><Input placeholder="e.g. Mon-Fri 8:30 AM - 5:30 PM" value={formBranch.hours || ''} onChange={(e) => setFormBranch({ ...formBranch, hours: e.target.value })} /></div>
            </div>
          ) : null}

          {dialog.type === 'download' ? (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>{t('adminTitle', 'Title')}</Label><Input placeholder="e.g. Loan Application Form" value={formDownload.title || ''} onChange={(e) => setFormDownload({ ...formDownload, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>{t('adminCategory', 'Category')}</Label><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" value={formDownload.categoryId || ''} onChange={(e) => setFormDownload({ ...formDownload, categoryId: e.target.value })}><option value="" disabled>{t('adminSelectCategory', 'Select category')}</option>{dedupedDownloadCategoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="space-y-1.5"><Label>{t('adminType', 'Type')}</Label><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" value={formDownload.fileType || 'PDF'} onChange={(e) => setFormDownload({ ...formDownload, fileType: e.target.value })}>{DOWNLOAD_FILE_TYPES.map((fileType) => <option key={fileType} value={fileType}>{fileType}</option>)}</select></div></div>
              <div className="space-y-1.5">
                <Label>{t('adminCmsUploadFile', 'Upload File')}</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setDownloadUploadFile(file);
                    if (!file) return;

                    const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                    const inferredTitle = formDownload.title?.trim() ? formDownload.title : file.name.replace(/\.[^.]+$/, '');
                    setFormDownload({
                      ...formDownload,
                      title: inferredTitle,
                      fileType: extension,
                      fileSize: formatUploadSize(file.size),
                    });
                  }}
                />
                {dialog.editId ? (
                  <p className="text-xs text-muted-foreground">
                    {t('adminCmsReplaceOrKeepHint', 'Choose a file to replace the current asset, or leave empty to keep the existing file/link.')}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t('adminCmsPreferUploadHint', 'Prefer upload for hosted files. You can still use a manual external link.')}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>{t('adminFileSize', 'File Size')}</Label><Input placeholder="e.g. 1.2 MB" value={formDownload.fileSize || ''} onChange={(e) => setFormDownload({ ...formDownload, fileSize: e.target.value })} /></div><div className="space-y-1.5"><Label>{t('adminCmsManualLinkOptional', 'Manual Link (optional)')}</Label><Input placeholder="e.g. https://example.com/file.pdf" value={formDownload.link || ''} onChange={(e) => setFormDownload({ ...formDownload, link: e.target.value })} /></div></div>
            </div>
          ) : null}

          {dialog.type === 'news' ? (
            <div className="space-y-4"><div className="space-y-1.5"><Label>{t('adminTitle', 'Title')}</Label><Input placeholder="e.g. New Branch Opening in Hawassa" value={formNews.title || ''} onChange={(e) => setFormNews({ ...formNews, title: e.target.value })} /></div><div className="space-y-1.5"><Label>{t('adminCmsExcerpt', 'Excerpt')}</Label><Textarea placeholder="e.g. Zemen SACCO opens a new branch to improve member access." value={formNews.excerpt || ''} onChange={(e) => setFormNews({ ...formNews, excerpt: e.target.value })} rows={3} /></div><div className="space-y-1.5"><Label>{t('adminCmsFullContentOptional', 'Full Content (optional)')}</Label><Textarea placeholder="e.g. Full story with key dates, services, and contact details." value={formNews.content || ''} onChange={(e) => setFormNews({ ...formNews, content: e.target.value })} rows={6} /></div><div className="space-y-1.5"><Label>{t('adminCmsUploadImage', 'Upload Image')}</Label><Input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0] || null; setNewsUploadFile(file); }} /><p className="text-xs text-muted-foreground">{t('adminCmsUploadImageHint', 'Prefer uploading image files. You can also provide an external image URL below.')}</p></div>{newsUploadPreviewUrl ? <div className="space-y-1.5"><Label>{t('adminCmsSelectedImagePreview', 'Selected Image Preview')}</Label><img src={newsUploadPreviewUrl} alt={t('adminCmsSelectedImagePreviewAlt', 'Selected news image preview')} className="h-36 w-full rounded-md border object-cover" /></div> : null}<div className="space-y-1.5"><Label>{t('adminCmsImageUrlOptional', 'Image URL (optional)')}</Label><Input value={formNews.imageUrl || ''} onChange={(e) => setFormNews({ ...formNews, imageUrl: e.target.value })} placeholder={t('adminCmsImageUrlPlaceholder', 'https://... or /uploads/...')} /></div>{!newsUploadPreviewUrl && formNews.imageUrl ? <div className="space-y-1.5"><Label>{t('adminCmsCurrentImage', 'Current Image')}</Label><img src={resolveCmsAssetUrl(formNews.imageUrl)} alt={t('adminCmsCurrentImageAlt', 'Current news image')} className="h-36 w-full rounded-md border object-cover" /></div> : null}<div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>{t('adminCategory', 'Category')}</Label><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" value={formNews.category || 'General'} onChange={(e) => setFormNews({ ...formNews, category: e.target.value })}>{newsCategoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div></div></div>
          ) : null}

          {dialog.type === 'faq' ? (
            <div className="space-y-4"><div className="space-y-1.5"><Label>{t('adminQuestion', 'Question')}</Label><Input placeholder="e.g. How long does loan approval take?" value={formFaq.question || ''} onChange={(e) => setFormFaq({ ...formFaq, question: e.target.value })} /></div><div className="space-y-1.5"><Label>{t('adminAnswer', 'Answer')}</Label><Textarea placeholder="e.g. Most applications are processed within 3 to 5 working days." value={formFaq.answer || ''} onChange={(e) => setFormFaq({ ...formFaq, answer: e.target.value })} rows={5} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>{t('adminCategory', 'Category')}</Label><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" value={formFaq.category || 'General'} onChange={(e) => setFormFaq({ ...formFaq, category: e.target.value })}>{faqCategoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div></div></div>
          ) : null}

          {/* Announcement editor removed from admin UI */}

              </TabsContent>

              <TabsContent value="publish" className="space-y-4 rounded-xl bg-white p-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-blue-900">{t('adminPublishingControls', 'Publishing Controls')}</p>
                  <p className="mb-3 text-xs text-blue-900">{t('adminPublishingHint', 'Control visibility and publish state before saving.')}</p>
                  {renderPublishingControls()}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('adminEditorTip', 'Editor tip')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('adminCmsUseDetailsThenPublish', 'Fill all required fields in Details, then set Publishing state and save changes.')}</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4">
            <Button variant="outline" onClick={closeDialog}>{t('adminCancel', 'Cancel')}</Button>
            <Button onClick={() => void saveItem()}>{dialog.editId ? t('adminSaveChanges', 'Save Changes') : t('adminCreate', 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={confirm.open} onClose={() => setConfirm({ open: false, type: '', id: '' })} onConfirm={() => void handleDelete()} title={tAdmin('deleteItem', 'Delete Item')} description={tAdmin('deleteItemConfirm', 'Are you sure you want to delete this item? This cannot be undone.')} cancelLabel={t('adminCancel', 'Cancel')} confirmLabel={t('adminDelete', 'Delete')} />
    </div>
  );
}
