import { getApiBaseUrl } from './apiBaseUrl';
import { fetchWithTimeout } from './fetchWithTimeout';

const baseUrl = getApiBaseUrl();

export const resolvePublicAssetUrl = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export type PublicInquiryInput = {
  fullName: string;
  message: string;
  email?: string;
  phone?: string;
  website?: string;
};

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicNews = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  imageUrl?: string | null;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicDownloadFile = {
  id: string;
  name: string;
  size: string;
  type: string;
  link: string;
};

export type PublicDownloadCategory = {
  id: string;
  title: string;
  files: PublicDownloadFile[];
};

export type PublicBranch = {
  id: string;
  name: string;
  location: string;
  officeHours: string;
  mapUrl: string;
  phonePrimary?: string;
  phoneSecondary?: string;
};

export type PublicPhoneContact = {
  name: string;
  number: string;
};

export type PublicService = {
  id: string;
  title: string;
  description: string;
  features: string[];
  ctaLabel?: string | null;
  ctaPath?: string | null;
  sortOrder: number;
  status: string;
};

export type PublicSaving = {
  id: string;
  title: string;
  description: string;
  features: string[];
  ctaLabel?: string | null;
  ctaPath?: string | null;
  sortOrder: number;
  status: string;
};

export type PublicLoanProduct = {
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
  sortOrder: number;
};

export type PublicAnnouncement = {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string | null;
  placement: string;
};

async function fetchPublic<T>(endpoint: string): Promise<T> {
  const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    // FIX 1: Handle rate limiting explicitly with clear context
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }

    // FIX 2: Safely extract error fallback without crashing if body is plain text/html
    let errorMessage = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload && typeof payload === 'object' && 'error' in payload) {
        errorMessage = String(payload.error);
      }
    } catch {
      // If parsing JSON fails, try reading as raw text instead
      try {
        const textFallback = await response.text();
        if (textFallback && textFallback.length < 100) errorMessage = textFallback;
      } catch {
        // Keep default error message if all reads fail
      }
    }

    throw new Error(errorMessage);
  }

  // FIX 3: Safe parse for final data layer return
  const json = await response.json();
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}


export async function fetchPublicFaqs(): Promise<PublicFaq[]> {
  const result = await fetchPublic<{ faqs: PublicFaq[] }>('/api/content/faqs');
  return result.faqs.filter(faq => (faq as any).published === true);
}

export async function fetchPublicNews(): Promise<PublicNews[]> {
  const result = await fetchPublic<any>('/api/news');
  return Array.isArray(result) ? result : (result?.news ?? result?.data ?? []);
}

export async function fetchPublicNewsArticle(slugOrId: string): Promise<PublicNews> {
  const result: any = await fetchPublic<any>(`/api/news/${encodeURIComponent(slugOrId)}`);
  return result?.article ?? result?.data ?? result;
}
export async function fetchPublicDownloads(): Promise<PublicDownloadCategory[]> {
  const result = await fetchPublic<{ categories: any[] }>('/api/downloads');
  // It already returns published categories with published files from backend
  const rawCategories = result.categories || (result as any[]) || [];
  
  return rawCategories.map(cat => ({
    id: cat.id,
    title: cat.name,
    files: (cat.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      size: file.fileSize,
      type: file.fileType,
      link: resolvePublicAssetUrl(file.fileUrl),
    })),
  })).filter(cat => cat.files && cat.files.length > 0);
}

export async function fetchPublicBranches(): Promise<{
  branches: PublicBranch[];
  phoneContacts: PublicPhoneContact[];
  phoneNumbers: string[];
}> {
  const result = await fetchPublic<{ branches: PublicBranch[] }>('/api/content/branches');
  const branches = result.branches || [];
  
  const phoneContacts: PublicPhoneContact[] = [];
  branches.forEach(branch => {
    if (branch.phonePrimary?.trim()) {
      phoneContacts.push({ name: branch.name, number: branch.phonePrimary });
    }
    if (branch.phoneSecondary?.trim()) {
      phoneContacts.push({ name: `${branch.name} (Alt)`, number: branch.phoneSecondary });
    }
  });

  return {
    branches,
    phoneContacts,
    phoneNumbers: phoneContacts.map(c => c.number)
  };
}

export async function fetchPublicServices(): Promise<PublicService[]> {
  const result = await fetchPublic<{ services: Array<Omit<PublicService, 'features'> & { features: unknown, status: string }> }>('/api/content/services');
  return result.services
    .filter(service => service.status === 'PUBLISHED')
    .map((service) => ({
      ...service,
      features: Array.isArray(service.features) ? service.features.filter((item): item is string => typeof item === 'string') : [],
    }));
}

export async function fetchPublicSavings(): Promise<PublicSaving[]> {
  const result = await fetchPublic<{ savings: Array<Omit<PublicSaving, 'features'> & { features: unknown, status: string }> }>('/api/content/savings');
  return result.savings
    .filter(s => s.status === 'PUBLISHED')
    .map((s) => ({
      ...s,
      features: Array.isArray(s.features) ? s.features.filter((item): item is string => typeof item === 'string') : [],
    }));
}

export async function fetchPublicLoanProducts(): Promise<PublicLoanProduct[]> {
  const result = await fetchPublic<{ loanProducts: PublicLoanProduct[] }>('/api/content/loan-products');
  return result.loanProducts.filter(loan => loan.status === 'PUBLISHED');
}

export async function fetchPublicAnnouncements(): Promise<PublicAnnouncement[]> {
  const result = await fetchPublic<{ announcements: PublicAnnouncement[] }>('/api/content/announcements');
  return result.announcements.filter(ann => ann.status === 'PUBLISHED' || ann.status === 'Active');
}

export async function submitPublicInquiry(payload: PublicInquiryInput): Promise<void> {
  const response = await fetchWithTimeout(`${baseUrl}/api/content/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed (${response.status})`);
  }
}

export type ConfigSavingType = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
};

export type ConfigLoanType = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
  minTenure?: number | null;
  maxTenure?: number | null;
};

export async function fetchConfigSavingTypes(): Promise<ConfigSavingType[]> {
  const result = await fetchPublic<{ savingTypes: ConfigSavingType[] }>('/api/settings/saving-types');
  return result.savingTypes;
}

export async function fetchConfigLoanTypes(): Promise<ConfigLoanType[]> {
  const result = await fetchPublic<{ loanTypes: ConfigLoanType[] }>('/api/settings/loan-types');
  return result.loanTypes;
}