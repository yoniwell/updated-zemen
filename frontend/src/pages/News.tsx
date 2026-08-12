import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, ArrowRight, Search, ArrowUp 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { fetchPublicNews, resolvePublicAssetUrl, type PublicNews } from '@/lib/publicContentApi';
import PublicServiceNotice from '@/components/PublicServiceNotice';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Link } from 'react-router-dom';


export default function News() {
  const { tPublic } = usePublicUiI18n();
  const [items, setItems] = useState<Array<PublicNews & { image?: string; fullContent?: string; previewText: string; date: string }>>([]);
  const [isCmsUnavailable, setIsCmsUnavailable] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  const buildListPreview = (excerpt?: string | null, content?: string | null): string => {
    const source = (excerpt && excerpt.trim().length > 0 ? excerpt : content || '').trim();
    if (!source) return '';

    // Keep list cards concise; full article body is shown on the detail page.
    return source.length > 260 ? `${source.slice(0, 260).trimEnd()}...` : source;
  };

  useEffect(() => {
    let mounted = true;

    const loadNews = async () => {
      try {
        const cmsNews = await fetchPublicNews();
        if (!mounted) return;
        setIsCmsUnavailable(false);

        if (cmsNews.length > 0) {
          setItems(
            cmsNews.map((item) => ({
              ...item,
              image: resolvePublicAssetUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80',
              fullContent: item.content || item.excerpt,
              previewText: buildListPreview(item.excerpt, item.content),
              date: new Date(item.updatedAt).toLocaleDateString(),
            }))
          );
        } else {
          setItems([]);
        }
      } catch {
        if (!mounted) return;
        setIsCmsUnavailable(true);
        setItems([]);
      }
    };

    void loadNews();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = ['All', ...new Set(items.map(item => item.category))];

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'All' || item.category === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-20 md:pb-24 md:pt-24">
      
      {/* 1. NEW MINIMALIST HEADER (HERO IMAGE REMOVED) */}
      <section className="container mx-auto mb-10 px-5 sm:px-6 md:mb-14">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl border-l-4 border-blue-600 py-3 pl-4 md:border-l-8 md:py-4 md:pl-8"
        >
          <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.28em] text-blue-600 md:mb-4 md:tracking-[0.4em]">
            {tPublic('newsPageKicker', 'Media and Publications')}
          </span>
          <h1 className="text-3xl font-black uppercase italic leading-none tracking-tighter text-slate-900 sm:text-5xl md:text-6xl">
            {tPublic('newsPageTitlePrefix', 'Zemen')} <span className="text-blue-600">{tPublic('newsPageTitleAccent', 'Archive.')}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-bold italic text-slate-500 md:mt-6 md:text-lg">
            {tPublic('newsPageDescription', 'Official announcements, institutional updates, and regional milestones from the Zemen SACCO network.')}
          </p>
        </motion.div>
      </section>

      {isCmsUnavailable ? (
        <section className="container mx-auto mb-8 px-5 sm:px-6 md:mb-10">
          <PublicServiceNotice message={tPublic('newsPageServiceUnavailable', 'Live news service is temporarily unavailable. Please try again later.')} />
        </section>
      ) : null}

      {/* 2. DYNAMIC FILTER BAR */}
      <div className="sticky top-20 z-50 mb-8 border-b border-slate-100 bg-white/85 py-4 shadow-sm backdrop-blur-xl md:top-28 md:mb-12 md:py-5">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-5 sm:px-6 lg:flex-row lg:gap-6">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`border-2 px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all md:px-6 md:tracking-widest ${
                  filter === cat 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                    : 'bg-white border-slate-100 text-slate-500 hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                {cat === 'All' ? tPublic('newsPageAllCategory', 'All') : cat}
              </button>
            ))}
          </div>

          <div className="group relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-blue-600" />
            <input 
              type="text" 
              placeholder={tPublic('newsPageSearchPlaceholder', 'SEARCH DATA...')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-2 border-slate-100 bg-white py-3 pl-12 pr-4 text-[11px] font-black italic uppercase tracking-wider outline-none transition-all focus:border-blue-600 md:tracking-widest" 
            />
          </div>
        </div>
      </div>

      {/* 3. NEWS GRID */}
      <div className="container mx-auto px-5 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
          <AnimatePresence mode='popLayout'>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id || item.slug || item.title}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="group relative flex h-auto flex-col overflow-hidden rounded-none border-none bg-white shadow-md transition-all duration-500 hover:shadow-2xl sm:min-h-[240px] sm:flex-row">
                  <div className="relative h-48 w-full overflow-hidden sm:h-auto sm:w-2/5">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                    />
                    <div className="absolute top-0 left-0 bg-blue-600 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest">
                      {item.category}
                    </div>
                  </div>
                  <div className="flex w-full flex-col justify-between p-5 sm:w-3/5 md:p-6">
                    <div>
                      <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-2">
                        <Calendar size={12} /> {item.date}
                      </div>
                      <h3 className="text-lg font-black uppercase italic leading-tight tracking-tighter text-slate-900 group-hover:text-blue-600 md:text-xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs font-bold italic leading-relaxed text-slate-500 line-clamp-4 md:mt-3">
                        {item.previewText}
                      </p>
                    </div>
                    <Link 
                      to={`/news/${item.id}`} 
                      className="mt-4 inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950 transition-all hover:text-blue-600 md:tracking-[0.3em]"
                    >
                      {tPublic('newsPageViewReport', 'View Report')} <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. BACK TO TOP BUTTON */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-[60] bg-blue-950 p-3 text-white shadow-2xl transition-all hover:bg-blue-600 active:scale-90 md:bottom-10 md:right-10 md:p-4"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
