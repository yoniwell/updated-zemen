import i18n from '@/i18n';

const localeByLanguage: Record<string, string> = {
  en: 'en-ET',
  am: 'am-ET',
  ti: 'ti-ER',
};

export const getLocale = (): string => {
  const lang = i18n.resolvedLanguage || i18n.language || 'en';
  return localeByLanguage[lang] || 'en-ET';
};

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(getLocale(), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(getLocale(), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value);
};

export const formatCurrency = (value: number, currency = 'ETB'): string => {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};
