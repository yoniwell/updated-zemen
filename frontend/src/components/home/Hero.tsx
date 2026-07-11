import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Link } from 'react-router-dom';
// Images
import heroOfficeImg1 from '@/assets/unnamed (6).jpg';
import heroOfficeImg2 from '@/assets/photo_2026-04-08_17-03-50.jpg';

export function Hero() {
  const [currentImage, setCurrentImage] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const images = [heroOfficeImg1, heroOfficeImg2];
  const { tPublic } = usePublicUiI18n();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();

    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      setCurrentImage(0);
      return;
    }

    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length, isMobileViewport]);

  return (
    <section className="relative flex min-h-[82vh] w-full items-end overflow-hidden bg-blue-950 md:min-h-screen md:items-center">
      
      {/* BACKGROUND FULL COVER */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImage}
            src={images[currentImage]} 
            alt={tPublic('homeHeroImageAlt', 'Hero')} 
            initial={isMobileViewport ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={isMobileViewport ? { opacity: 1, scale: 1 } : { opacity: 0 }}
            transition={isMobileViewport ? { duration: 0 } : { duration: 1.2 }}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </AnimatePresence>

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-blue-950/75 via-blue-950/65 to-blue-950/25 md:bg-gradient-to-r md:from-blue-950/80 md:via-blue-950/40 md:to-transparent" />
      </div>

      {/* CONTENT (NO PADDING TOP) */}
      <div className="container relative z-20 mx-auto px-5 pb-10 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pb-0 md:pt-0 lg:px-16">
        <div className="max-w-3xl">
          
          <p className="mb-3 text-[10px] font-black tracking-[0.22em] text-blue-300 sm:mb-4 sm:text-xs sm:tracking-[0.3em]">
            {tPublic('homeHeroKicker', 'SECURE • TRUSTED • GROWTH')}
          </p>

          <h1 className="mb-4 text-3xl font-black leading-[1.08] text-white sm:mb-5 sm:text-4xl lg:text-6xl">
            {tPublic('homeHeroTitlePrefix', 'Building Wealth')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white">
              {tPublic('homeHeroTitleAccent', 'Together.')}
            </span>
          </h1>

          <p className="mb-7 max-w-xl text-sm text-blue-100 sm:mb-8 sm:text-base">
            {tPublic('homeHeroDescription', 'Professional savings and credit solutions designed for modern members seeking sustainable growth.')}
          </p>

          <div className="grid gap-3 sm:flex sm:flex-wrap sm:gap-4">
            <Button asChild className="h-12 w-full bg-blue-600 px-6 text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 sm:w-auto md:h-14 md:px-8">
              <Link to="/membership-apply">{tPublic('becomeMember', 'Become a Member')}</Link>
            </Button>

            <Button asChild variant="outline" className="h-12 w-full border-white/80 px-6 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:bg-white hover:text-blue-950 sm:w-auto md:h-14 md:px-8">
              <Link to="/loan-apply">{tPublic('applyLoan', 'Apply Loan')}</Link>
            </Button>

            <Button asChild variant="secondary" className="h-12 w-full bg-white/20 px-6 text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/35 sm:w-auto md:h-14 md:px-8">
              <Link to="/status">{tPublic('trackApplication', 'Track Application')}</Link>
            </Button>
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/90">
            {tPublic('homeHeroAssistiveHint', 'Online application takes about 5 minutes.')}
          </p>
        </div>
      </div>

      {/* BOTTOM LINE */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-20" />
    </section>
  );
}
