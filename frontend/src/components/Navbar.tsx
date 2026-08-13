import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/translations';
import { publicRouteMap } from '@/lib/publicRoutes';
import type { Page } from '../App';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown, Search, Phone, MapPin, Globe, ArrowRight } from 'lucide-react';
const isSupportedLanguage = (code: string): code is 'en' | 'am' | 'ti' => {
  return code === 'en' || code === 'am' || code === 'ti';
};

type NavLink = { key: keyof typeof translations.en; id: Page };

const standaloneLinks: NavLink[] = [
  { key: 'home', id: 'home' },
  { key: 'about', id: 'about' },
  { key: 'apply', id: 'apply' },
  { key: 'news', id: 'news' },
  { key: 'faq', id: 'faq' },
  { key: 'contact', id: 'contact' },
];

const applicationsDropdownLinks: NavLink[] = [
  { key: 'membership', id: 'membership' },
  { key: 'loans', id: 'loanInfo' },
  { key: 'trackApplication', id: 'status' },
];

const servicesDropdownLinks: NavLink[] = [
  { key: 'savings', id: 'savings' },
  { key: 'loans', id: 'loans' },
  { key: 'downloads', id: 'downloads' },
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'am', name: 'አማርኛ' },
  { code: 'ti', name: 'ትግርኛ' }
];

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [applicationsOpen, setApplicationsOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileApplicationsOpen, setMobileApplicationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const t = translations[lang];

  const searchableLinks = useMemo(() => {
    const deduped = new Map<Page, NavLink>();
    [{ key: 'services', id: 'services' } as NavLink, ...standaloneLinks, ...applicationsDropdownLinks, ...servicesDropdownLinks].forEach((link) => {
      deduped.set(link.id, link);
    });
    return [...deduped.values()];
  }, []);

  const [homeNavLink, ...secondaryNavLinks] = standaloneLinks;

  const closeMenus = () => {
    setIsOpen(false);
    setServicesOpen(false);
    setApplicationsOpen(false);
    setMobileServicesOpen(false);
    setMobileApplicationsOpen(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleNavigation = (page: Page) => {
    navigate(publicRouteMap[page]);
    onNavigate(page);
    closeMenus();
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    window.scrollTo({ top: 0, behavior: isMobileViewport ? 'auto' : 'smooth' });
  };

  const handleServicesDropdownNavigation = (link: NavLink) => {
    if (link.id === 'loans') {
      navigate('/loans?view=service');
      onNavigate('loans');
      closeMenus();
      const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
      window.scrollTo({ top: 0, behavior: isMobileViewport ? 'auto' : 'smooth' });
      return;
    }

    handleNavigation(link.id);
  };

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return [] as NavLink[];
    }

    return searchableLinks.filter((link) =>
      t[link.key].toLowerCase().includes(normalized)
    );
  }, [searchQuery, searchableLinks, t]);

  const isServicesSectionActive = currentPage === 'services' || currentPage === 'savings' || currentPage === 'downloads' || currentPage === 'loans';
  const isApplicationsSectionActive = currentPage === 'membership' || currentPage === 'loanInfo' || currentPage === 'status';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] w-full shadow-sm">
      
      {/* 1. TOP BAR (CONTACT & LOCATION FROM SCREENSHOT) */}
      <div className="bg-white border-b hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center h-16">
          
          <div className="bg-blue-700 text-white px-8 py-3 rounded-r-full text-xs font-black uppercase tracking-[0.2em] -ml-4 shadow-lg">
            {t.welcome}
          </div>

          <div className="flex items-center divide-x divide-slate-100">
            {/* PHONE SECTION */}
            <div className="flex items-center px-8 gap-4">
              <div className="bg-blue-50 p-2.5 rounded-full">
                <Phone className="h-5 w-5 text-blue-700 fill-blue-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-black text-slate-900 tracking-tight">Call Us: +251 953444411</span>
                <span className="text-[12px] font-bold text-slate-400"></span>
              </div>
            </div>

            {/* LOCATION SECTION */}
            <div className="flex items-center px-8 gap-4">
              <div className="bg-blue-50 p-2.5 rounded-full">
                <MapPin className="h-5 w-5 text-blue-700 fill-blue-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-black text-slate-900 tracking-tight">Hawezien Adebaby, Mekelle</span>
                <span className="text-[12px] font-bold text-slate-400"> Mekelle,Tigray, Ethiopia</span>
              </div>
            </div>

            {/* LANGUAGE PICKER */}
            <div className="relative pl-8">
              <button 
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest text-slate-700 hover:text-blue-700 transition-all"
              >
                <Globe className="h-4 w-4" />
                <span>{languages.find(l => l.code === lang)?.name}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", langOpen && "rotate-180")} />
              </button>

              {langOpen && (
                <div className="absolute top-full mt-4 right-0 w-40 bg-white border border-slate-100 rounded-xl shadow-2xl z-[110] py-2">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        if (isSupportedLanguage(l.code)) {
                          setLang(l.code);
                        }
                        setLangOpen(false);
                      }}
                      className="w-full text-left px-5 py-3 text-xs font-bold hover:bg-blue-50 transition-colors border-b last:border-0 border-slate-50"
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAV (INCREASED LOGO SIZE) */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="relative flex h-16 items-center justify-between md:h-20">

            {/* BIGGER LOGO */}
            <button onClick={() => handleNavigation('home')} className="hover:scale-105 transition-transform">
              <img src="/zemen-logo.png" alt="Zemen SACCO logo" className="h-12 w-auto object-contain md:h-16" />
            </button>

            <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.22em] text-blue-900 sm:text-xs lg:hidden">
              Zemen Sacco
            </p>

            {/* DESKTOP LINKS */}
            <div className="hidden lg:flex items-center gap-8">
              <button
                key={homeNavLink.id}
                onClick={() => handleNavigation(homeNavLink.id)}
                className={cn(
                  "text-[12px] font-black uppercase tracking-widest transition-all",
                  currentPage === homeNavLink.id ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"
                )}
              >
                {t[homeNavLink.key]}
              </button>

              <div className="relative" onMouseEnter={() => setApplicationsOpen(true)} onMouseLeave={() => setApplicationsOpen(false)}>
                <button
                  onClick={() => setApplicationsOpen(true)}
                  className={cn(
                    'flex items-center gap-1 text-[12px] font-black uppercase tracking-widest transition-all',
                    isApplicationsSectionActive ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-600 hover:text-blue-700'
                  )}
                >
                  {t.applications}
                  <ChevronDown className={cn('h-4 w-4 transition-transform', applicationsOpen && 'rotate-180')} />
                </button>

                {applicationsOpen && (
                  <div className="absolute right-0 top-full z-[120] w-52 pt-3">
                    <div className="rounded-xl border border-slate-100 bg-white py-2 shadow-2xl">
                      {applicationsDropdownLinks.map((link) => (
                        <button
                          key={link.id}
                          onClick={() => handleNavigation(link.id)}
                          className="block w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {t[link.key]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleNavigation('services')}
                    className={cn(
                      'text-[12px] font-black uppercase tracking-widest transition-all',
                      isServicesSectionActive ? 'text-blue-700 border-b-2 border-blue-700' : 'text-slate-600 hover:text-blue-700'
                    )}
                  >
                    {t.services}
                  </button>

                  <button
                    aria-label="Toggle services menu"
                    onClick={() => setServicesOpen((open) => !open)}
                    className={cn(
                      'p-0.5 transition-colors',
                      isServicesSectionActive ? 'text-blue-700' : 'text-slate-600 hover:text-blue-700'
                    )}
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', servicesOpen && 'rotate-180')} />
                  </button>
                </div>

                {servicesOpen && (
                  <div className="absolute right-0 top-full z-[120] w-52 pt-3">
                    <div className="rounded-xl border border-slate-100 bg-white py-2 shadow-2xl">
                      {servicesDropdownLinks.map((link) => (
                        <button
                          key={link.id}
                          onClick={() => handleServicesDropdownNavigation(link)}
                          className="block w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {t[link.key]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {secondaryNavLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavigation(link.id)}
                  className={cn(
                    "text-[12px] font-black uppercase tracking-widest transition-all",
                    currentPage === link.id ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"
                  )}
                >
                  {t[link.key]}
                </button>
              ))}
            </div>

            {/* SEARCH & ACTION */}
            <div className="hidden lg:flex items-center">
              <button aria-label="Open search" onClick={() => setIsSearchOpen(true)} className="p-3 hover:bg-slate-50 rounded-full transition-colors">
                <Search className="h-6 w-6 text-slate-800" />
              </button>
            </div>

            {/* MOBILE TRIGGER */}
            <div className="lg:hidden flex items-center">
              <button
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setIsOpen((open) => !open)}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SLEEK SPOTLIGHT SEARCH MODAL */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 md:p-16 flex items-start justify-center overflow-y-auto"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 overflow-hidden mt-6 md:mt-12"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Bar Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <Search className="h-5 w-5 text-blue-600 shrink-0" />
                <input 
                  autoFocus 
                  placeholder="Search pages, services, or guidelines..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
                />
                <button
                  aria-label="Close search"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Results Body */}
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                {searchQuery.trim() ? (
                  searchResults.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Matching Results ({searchResults.length})</p>
                      {searchResults.map((result) => (
                        <button 
                          key={result.id} 
                          onClick={() => handleNavigation(result.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50/80 rounded-xl transition-all border border-transparent hover:border-blue-100 group text-left"
                        >
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{t[result.key]}</span>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4">
                      <p className="text-sm font-semibold text-slate-500">No matching pages or services found for "{searchQuery}"</p>
                      <p className="text-xs text-slate-400 mt-1">Try searching for "Loans", "Membership", "Downloads", or "FAQs"</p>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Quick Links & Popular Sections</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchableLinks.slice(0, 6).map((link) => (
                        <button 
                          key={link.id} 
                          onClick={() => handleNavigation(link.id)}
                          className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-blue-50/80 rounded-xl border border-slate-100 hover:border-blue-100 transition-all text-left group"
                        >
                          <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{t[link.key]}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Zemen SACCO Search Explorer</span>
                <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] shadow-xs">ESC</kbd> to close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            className="fixed inset-0 z-[150] overflow-y-auto bg-white px-6 pb-10 pt-24 lg:hidden"
          >
            <button
              aria-label="Close mobile menu"
              onClick={() => setIsOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-700 hover:bg-slate-100"
            >
              <X className="h-6 w-6" />
            </button>

            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Quick Access</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {applicationsDropdownLinks.map((link) => (
                <button
                  key={`quick-${link.id}`}
                  onClick={() => handleNavigation(link.id)}
                  className="rounded-xl border border-blue-100 bg-blue-50 px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-blue-900"
                >
                  {t[link.key]}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200">
              <button
                onClick={() => setMobileApplicationsOpen((open) => !open)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black uppercase tracking-wide text-slate-800"
              >
                <span>{t.applications}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileApplicationsOpen && 'rotate-180')} />
              </button>

              {mobileApplicationsOpen ? (
                <div className="border-t border-slate-100 px-3 py-2">
                  {applicationsDropdownLinks.map((link) => (
                    <button
                      key={`mobile-app-${link.id}`}
                      onClick={() => handleNavigation(link.id)}
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {t[link.key]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => handleNavigation('services')}
                  className={cn(
                    'text-left text-sm font-black uppercase tracking-wide transition-colors',
                    isServicesSectionActive ? 'text-blue-700' : 'text-slate-800 hover:text-blue-700'
                  )}
                >
                  {t.services}
                </button>

                <button
                  aria-label="Toggle services menu"
                  onClick={() => setMobileServicesOpen((open) => !open)}
                  className={cn(
                    'rounded-full p-1 transition-colors',
                    mobileServicesOpen ? 'text-blue-700' : 'text-slate-600 hover:text-blue-700'
                  )}
                >
                  <ChevronDown className={cn('h-4 w-4 transition-transform', mobileServicesOpen && 'rotate-180')} />
                </button>
              </div>

              {mobileServicesOpen ? (
                <div className="border-t border-slate-100 px-3 py-2">
                  {servicesDropdownLinks.map((link) => (
                    <button
                      key={`mobile-services-${link.id}`}
                      onClick={() => handleServicesDropdownNavigation(link)}
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {t[link.key]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {[homeNavLink, ...secondaryNavLinks].map((link) => (
                <button
                  key={`mobile-flat-${link.id}`}
                  onClick={() => handleNavigation(link.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-black uppercase tracking-wide text-slate-800 hover:border-blue-300 hover:text-blue-700"
                >
                  {t[link.key]}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-700">Support</p>
              <p className="mt-2 text-sm font-semibold text-blue-950">+251 953444411</p>
              <p className="text-sm font-semibold text-blue-900/80">+251 997346200</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
