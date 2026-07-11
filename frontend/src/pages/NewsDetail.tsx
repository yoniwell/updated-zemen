import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Share2, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { newsItems } from './newsData'; 
import { fetchPublicNewsArticle, resolvePublicAssetUrl, type PublicNews } from '@/lib/publicContentApi';
import PublicServiceNotice from '@/components/PublicServiceNotice';

type DetailArticle = {
  title: string;
  date: string;
  category: string;
  image: string;
  excerpt: string;
  fullContent: string;
};

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<DetailArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCmsUnavailable, setIsCmsUnavailable] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    let mounted = true;

    const fromFallback = (): DetailArticle | null => {
      const byIndex = Number.isFinite(Number(id)) ? newsItems[Number(id)] : null;
      if (byIndex) {
        return byIndex;
      }

      const bySlug = newsItems.find((item) =>
        item.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-') === (id || '').toLowerCase()
      );

      return bySlug || null;
    };

    const loadArticle = async () => {
      if (!id) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const apiArticle: PublicNews = await fetchPublicNewsArticle(id);
        if (!mounted) return;

        setIsCmsUnavailable(false);

        setArticle({
          title: apiArticle.title,
          date: new Date(apiArticle.updatedAt).toLocaleDateString(),
          category: apiArticle.category,
          image: resolvePublicAssetUrl(apiArticle.imageUrl) || newsItems[0]?.image || '',
          excerpt: apiArticle.excerpt,
          fullContent: apiArticle.content || apiArticle.excerpt,
        });
      } catch {
        if (!mounted) return;
        setIsCmsUnavailable(true);
        setArticle(fromFallback());
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadArticle();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 text-center text-2xl font-black italic text-blue-950 md:text-4xl">
        LOADING ARTICLE
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 text-center text-2xl font-black italic text-blue-950 md:text-4xl">
        404: ARTICLE NOT FOUND
      </div>
    );
  }

  const contentParagraphs = article.fullContent
    .split(/\r?\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-x-hidden">
      
      {/* --- LEFT SIDE: FIXED IMAGE SECTION --- */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="relative h-[42vh] overflow-hidden md:h-[50vh] lg:sticky lg:top-0 lg:h-screen lg:w-1/2"
      >
        <button 
          onClick={() => navigate('/news')}
          className="group absolute left-4 top-4 z-30 rounded-full border border-white/20 bg-white/10 p-3 text-white backdrop-blur-xl transition-all hover:bg-white hover:text-blue-950 md:left-8 md:top-8 md:p-4"
        >
          <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        
        <img 
          src={article.image} 
          alt={article.title} 
          className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-[2s]"
        />
        
        {/* Overlay for Image Credit/Tag */}
        <div className="absolute bottom-4 left-4 z-20 md:bottom-10 md:left-10">
          <span className="bg-blue-600 px-4 py-2 text-[10px] font-black uppercase italic tracking-[0.2em] text-white shadow-2xl md:px-6 md:tracking-[0.3em]">
            {article.category}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent lg:hidden" />
      </motion.div>

      {/* --- RIGHT SIDE: SCROLLABLE CONTENT --- */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex flex-col justify-center p-5 sm:p-8 md:p-12 lg:w-1/2 lg:p-16"
      >
        {isCmsUnavailable ? (
          <div className="mb-8">
            <PublicServiceNotice message="Live article service is temporarily unavailable. Showing fallback content where available." />
          </div>
        ) : null}

        {/* Breadcrumb / Meta */}
        <div className="mb-8 flex flex-wrap items-center gap-4 md:mb-12 md:gap-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600">
            <Calendar size={14} /> {article.date}
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Clock size={14} /> 5 MIN READ
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-7 text-3xl font-black italic uppercase leading-[0.95] tracking-tighter text-blue-950 sm:text-5xl md:mb-10 md:text-6xl">
          {article.title.split(' ').map((word, i) => (
            <span key={i} className={i % 2 === 1 ? "text-blue-600" : ""}>
              {word}{' '}
            </span>
          ))}
        </h1>

        {/* Article Body */}
        <div className="space-y-6">
          <p className="mb-8 border-l-4 border-slate-100 pl-4 text-base font-bold italic leading-relaxed text-slate-500 md:mb-10 md:border-l-8 md:pl-8 md:text-xl">
            {article.excerpt || "This exclusive report details the latest strategic advancements within our professional service hub framework."}
          </p>
          
          <div className="prose prose-slate prose-lg max-w-none">
            {contentParagraphs.length > 0 ? (
              contentParagraphs.map((paragraph, index) => (
                <p key={`${article.title}-paragraph-${index}`} className="text-base font-medium italic leading-loose text-slate-700 md:text-lg">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-base font-medium italic leading-loose text-slate-700 md:text-lg">
                {article.excerpt}
              </p>
            )}
          </div>
        </div>

        {/* Interactive Bottom Bar */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-slate-100 pt-8 md:mt-14 md:gap-8 md:pt-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black italic">
              ZK
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Published By</p>
              <p className="text-sm font-black italic text-blue-950 uppercase">Zemen Media Office</p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <Button variant="outline" className="h-11 rounded-full border-slate-200 px-5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-600 hover:text-white md:h-12 md:px-6">
                <Share2 size={16} className="mr-2" /> Share Report
             </Button>
          </div>
        </div>

        {/* Navigation Footer */}
        <button 
          onClick={() => navigate('/news')}
          className="group mt-10 flex items-center gap-3 text-xl font-black italic uppercase tracking-tighter text-blue-950 md:mt-14 md:gap-4 md:text-2xl"
        >
          Next Report <ChevronRight className="group-hover:translate-x-2 transition-transform text-blue-600" size={32} />
        </button>
      </motion.div>
    </div>
  );
}
