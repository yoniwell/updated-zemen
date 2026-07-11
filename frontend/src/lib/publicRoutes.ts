export type PublicPage =
  | 'home'
  | 'about'
  | 'services'
  | 'loans'
  | 'savings'
  | 'downloads'
  | 'membership'
  | 'apply'
  | 'portal'
  | 'faq'
  | 'news'
  | 'contact'
  | 'status';

export const publicRouteMap: Record<PublicPage, string> = {
  home: '/',
  about: '/about',
  services: '/services',
  loans: '/loans',
  savings: '/savings',
  downloads: '/downloads',
  membership: '/membership',
  apply: '/apply',
  portal: '/portal',
  faq: '/faq',
  news: '/news',
  contact: '/contact',
  status: '/status',
};

const normalizePath = (pathname: string): string => {
  const trimmed = pathname.toLowerCase().replace(/\/+$/, '');
  return trimmed || '/';
};

const pathToPageMap: Record<string, PublicPage> = {
  '/': 'home',
  '/home': 'home',
  '/about': 'about',
  '/services': 'services',
  '/loans': 'loans',
  '/loan-apply': 'loans',
  '/savings': 'savings',
  '/downloads': 'downloads',
  '/membership': 'membership',
  '/membership-apply': 'membership',
  '/apply': 'apply',
  '/portal': 'portal',
  '/faq': 'faq',
  '/news': 'news',
  '/contact': 'contact',
  '/status': 'status',
};

export const resolvePublicPageFromPath = (pathname: string): PublicPage | null => {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath.startsWith('/admin')) {
    return null;
  }

  if (normalizedPath.startsWith('/news/')) {
    return 'news';
  }

  return pathToPageMap[normalizedPath] ?? null;
};
