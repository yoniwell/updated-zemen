import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Newspaper } from 'lucide-react';
import { fetchPublicAnnouncements, fetchPublicNews, resolvePublicAssetUrl, type PublicAnnouncement, type PublicNews } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Link } from 'react-router-dom';
const fallbackNewsItems = [
  {
    titleKey: 'homeNewsFallbackItem1Title',
    titleFallback: 'Annual General Assembly Meeting 2024',
    date: 'Oct 24, 2024',
    categoryKey: 'homeNewsCategoryMeeting',
    categoryFallback: 'Meeting',
    excerptKey: 'homeNewsFallbackItem1Excerpt',
    excerptFallback: 'Join us for the upcoming annual general meeting where we will discuss our yearly performance and dividends.',
  },
  {
    titleKey: 'homeNewsFallbackItem2Title',
    titleFallback: 'New Digital Loan Application Portal Launched',
    date: 'Sep 15, 2024',
    categoryKey: 'homeNewsCategoryProductUpdate',
    categoryFallback: 'Product Update',
    excerptKey: 'homeNewsFallbackItem2Excerpt',
    excerptFallback: 'We are excited to announce our new online portal for faster and more convenient loan applications.',
  },
  {
    titleKey: 'homeNewsFallbackItem3Title',
    titleFallback: 'New Branch Opening in Bole',
    date: 'Aug 30, 2024',
    categoryKey: 'homeNewsCategoryBranchNotice',
    categoryFallback: 'Branch Notice',
    excerptKey: 'homeNewsFallbackItem3Excerpt',
    excerptFallback: 'To serve our members better, we have opened a new branch in the heart of Bole sub-city.',
  },
];

export function News() {
  const { tPublic } = usePublicUiI18n();
  const [cmsNews, setCmsNews] = useState<PublicNews[]>([]);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadContent = async () => {
      try {
        const [newsResult, announcementResult] = await Promise.allSettled([
          fetchPublicNews(),
          fetchPublicAnnouncements(),
        ]);

        if (!mounted) return;

        if (newsResult.status === 'fulfilled') setCmsNews(newsResult.value);
        if (announcementResult.status === 'fulfilled') setAnnouncements(announcementResult.value);
      } catch {
        if (mounted) {
          setCmsNews([]);
          setAnnouncements([]);
        }
      }
    };

    void loadContent();
    return () => {
      mounted = false;
    };
  }, []);

  const newsItems = useMemo(() => {
    if (!cmsNews.length) {
      return fallbackNewsItems.map((item, index) => ({
        slug: String(index),
        title: tPublic(item.titleKey, item.titleFallback),
        date: item.date,
        category: tPublic(item.categoryKey, item.categoryFallback),
        excerpt: tPublic(item.excerptKey, item.excerptFallback),
        image: '',
      }));
    }
    return cmsNews.slice(0, 3).map((item) => ({
      slug: item.slug,
      title: item.title,
      date: item.updatedAt.slice(0, 10),
      category: item.category,
      excerpt: (item.content && item.content.trim().length > 0 ? item.content : item.excerpt).trim(),
      image: resolvePublicAssetUrl(item.imageUrl),
    }));
  }, [cmsNews, tPublic]);

  return (
    <section className="py-28 bg-white overflow-hidden">
      <div className="container mx-auto px-6 lg:px-16">

        {announcements.filter((announcement) => announcement.placement === 'Homepage Above News').length > 0 ? (
          <div className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-700">{tPublic('homeNewsLatestAnnouncement', 'Latest Announcement')}</p>
            {announcements
              .filter((announcement) => announcement.placement === 'Homepage Above News')
              .slice(0, 1)
              .map((announcement) => (
                <div key={announcement.id}>
                  <p className="mt-1 text-sm font-semibold text-blue-950">{announcement.title}</p>
                  <p className="text-xs text-blue-800">{announcement.content}</p>
                </div>
              ))}
          </div>
        ) : null}
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <Newspaper className="text-blue-600" size={20} />
              <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px]">{tPublic('homeNewsInsights', 'Insights')}</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-blue-950 uppercase italic tracking-tighter">
              {tPublic('homeNewsTitle', 'News and Updates')}
            </h2>
          </div>
          <Link 
            to="/news" 
            className="group flex items-center gap-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white px-8 py-4 transition-all duration-300 border border-blue-100"
          >
            <span className="font-black uppercase tracking-widest text-[11px]">{tPublic('homeNewsArchive', 'Archive')}</span>
            <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200 shadow-2xl">
          {newsItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`group relative p-10 lg:p-12 flex flex-col justify-between min-h-[420px] transition-all duration-500 hover:bg-blue-950 ${
                index !== newsItems.length - 1 ? 'border-b md:border-b-0 md:border-r border-slate-200' : ''
              }`}
            >
              <div>
                {item.image ? (
                  <div className="mb-6 overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : null}

                <div className="flex items-center justify-between mb-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 group-hover:text-blue-400">
                    {item.category}
                  </span>
                  <div className="flex items-center text-slate-400 group-hover:text-blue-300 text-[10px] font-bold uppercase">
                    <Calendar className="h-3 w-3 mr-1.5" />
                    {item.date}
                  </div>
                </div>

                <h3 className="text-2xl font-black text-blue-950 group-hover:text-white leading-tight uppercase italic mb-6 transition-colors duration-300">
                  {item.title}
                </h3>
                
                <p className="text-slate-500 group-hover:text-blue-100/70 text-sm font-bold italic line-clamp-6 border-l-2 border-blue-600 pl-4 transition-colors">
                  {item.excerpt}
                </p>
              </div>

              <div className="mt-10">
                <Link 
                  to={`/news/${item.slug || index}`} 
                  className="inline-flex items-center gap-3 text-blue-600 group-hover:text-white text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  {tPublic('homeNewsReadFullStory', 'Read Full Story')}
                  <div className="w-8 h-[1px] bg-blue-600 group-hover:bg-white group-hover:w-12 transition-all duration-300"></div>
                </Link>
              </div>

              {/* Decorative Corner Element */}
              <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[20px] border-r-[20px] border-transparent group-hover:border-r-blue-600 group-hover:border-b-blue-600 transition-all duration-300" />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
