import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PiggyBank, 
  HandCoins, 
  UserPlus, 
  Smartphone, 
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Users,
  ShieldCheck
} from 'lucide-react';
import { Page } from '../App';
import { fetchPublicServices, type PublicService } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';

// Assets
import heroImg from '@/assets/unnamed (6).jpg';

interface ServicesProps {
  onNavigate: (page: Page) => void;
}

interface ServiceCardProps {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  cta: string;
  onCtaClick?: () => void;
}

const Services: React.FC<ServicesProps> = ({ onNavigate }) => {
  const { tPublicUi } = usePublicUiI18n();
  const [cmsServices, setCmsServices] = useState<PublicService[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadServices = async () => {
      try {
        const data = await fetchPublicServices();
        if (mounted) setCmsServices(data);
      } catch {
        if (mounted) setCmsServices([]);
      }
    };

    void loadServices();
    return () => {
      mounted = false;
    };
  }, []);

  const renderedServices = useMemo<ServiceCardProps[]>(() => {
    if (!cmsServices.length) return [];
    return cmsServices
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item, index) => ({
        number: String(index + 1).padStart(2, '0'),
        icon: index % 4 === 0 ? <PiggyBank size={36} /> : index % 4 === 1 ? <HandCoins size={36} /> : index % 4 === 2 ? <UserPlus size={36} /> : <Smartphone size={36} />,
        title: item.title,
        description: item.description,
        features: item.features.length ? item.features : ['Service benefit'],
        cta: item.ctaLabel || 'Learn More',
        onCtaClick: item.ctaPath ? () => window.location.assign(item.ctaPath as string) : undefined,
      }));
  }, [cmsServices]);

  return (
    <div className="bg-white">
      
      {/* 1. BRIGHT HERO WITH HIGH-CONTRAST TEXT */}
      <section className="relative overflow-hidden bg-white py-20 md:py-24 lg:py-32">
        {/* Background Image: Bright but slightly desaturated for text pop */}
        <img 
          src={heroImg} 
          className="absolute inset-0 w-full h-full object-cover opacity-60 contrast-125 brightness-110" 
          alt="Zemen Excellence" 
        />
        
        {/* Modern Glass Gradient: Protects the text area */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        
        <div className="container relative z-10 mx-auto px-5 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center lg:gap-14">
            
            {/* Left Side: High Visibility Text */}
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.35em] text-blue-700 drop-shadow-sm sm:mb-6 sm:text-[12px] sm:tracking-[0.8em]">
                  {tPublicUi('theStandardOfTrust', 'The Standard of Trust')}
                </span>
                
                {/* Heading with drop-shadow for extreme visibility */}
                <h1 className="mb-6 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-blue-950 drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)] sm:mb-8 sm:text-5xl lg:text-7xl">
                  <span className="text-transparent" style={{ WebkitTextStroke: '2px #172554' }}>{tPublicUi('ourServices', 'Our Services')}</span>
                </h1>
                
                {/* Paragraph with subtle text-shadow */}
                <p className="mb-8 max-w-xl text-base font-bold italic leading-relaxed text-slate-800 drop-shadow-sm sm:mb-10 sm:text-xl">
                  {tPublicUi('servicesHeroDescription', "Transparent, ethical, and modern financial tools designed to empower our community's growth in Addis Ababa.")}
                </p>

                <div className="flex gap-4">
                  <button 
                    onClick={() => onNavigate('contact')}
                    className="h-12 rounded-md bg-blue-700 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-700/40 transition-all hover:bg-blue-900 sm:h-14 sm:px-10"
                  >
                    {tPublicUi('getStartedToday', 'Get Started Today')}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Right Side: High-Contrast Stats Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 gap-5 border-2 border-white bg-white/60 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-md sm:p-8"
            >
              <div className="flex items-center gap-6">
                <TrendingUp className="text-blue-700" size={32} />
                <div>
                  <div className="text-blue-950 font-black text-3xl leading-none italic drop-shadow-sm">12%</div>
                  <div className="text-blue-700 text-[10px] uppercase font-bold tracking-widest mt-1">{tPublicUi('growthShare', 'Growth Share')}</div>
                </div>
              </div>
              <div className="h-px w-full bg-blue-100" />
              <div className="flex items-center gap-6">
                <Users className="text-blue-700" size={32} />
                <div>
                  <div className="text-blue-950 font-black text-3xl leading-none italic drop-shadow-sm">5,000+</div>
                  <div className="text-blue-700 text-[10px] uppercase font-bold tracking-widest mt-1">{tPublicUi('verifiedMembers', 'Verified Members')}</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 2. SERVICES GRID (Remains same for clean UI) */}
      <section className="container mx-auto bg-slate-50/30 px-5 py-14 sm:px-6 md:py-20">
        <div className="relative z-20 -mt-16 grid gap-6 md:-mt-24 lg:grid-cols-2 lg:gap-8">
          {renderedServices.map((service) => (
            <ServiceCard
              key={`${service.number}-${service.title}`}
              number={service.number}
              icon={service.icon}
              title={service.title}
              description={service.description}
              features={service.features}
              cta={service.cta}
              onCtaClick={service.onCtaClick}
            />
          ))}
        </div>
      </section>
      
      {/* Footer Support Section */}
      <section className="container mx-auto px-5 pb-16 sm:px-6 md:pb-24">
        <div className="group flex flex-col items-start justify-between gap-6 rounded-none bg-blue-950 p-6 md:p-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-6 text-white">
            <div className="w-16 h-16 bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20 group-hover:rotate-6 transition-transform">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase italic tracking-tighter">{tPublicUi('stillHaveQuestions', 'Still have questions?')}</h4>
              <p className="text-blue-200/60 font-bold italic">{tPublicUi('consultantsReady', 'Our consultants are ready to help you navigate your options.')}</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <button onClick={() => onNavigate('faq')} className="h-11 border border-white/20 px-6 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 sm:h-12 sm:px-8">{tPublicUi('viewFaqs', 'View FAQs')}</button>
            <button onClick={() => onNavigate('contact')} className="h-11 bg-blue-600 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-white hover:text-blue-950 sm:h-12 sm:px-8">{tPublicUi('contactUs', 'Contact Us')}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- SUB-COMPONENT: SERVICE CARD ---
const ServiceCard = ({ number, icon, title, description, features, cta, onCtaClick }: ServiceCardProps) => (
  <motion.div 
    whileHover={{ y: -12 }}
    className="group relative overflow-hidden border border-slate-100 bg-white p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:border-blue-600 md:p-8 lg:p-10"
  >
    <div className="absolute top-0 left-0 w-2 h-0 bg-blue-600 group-hover:h-full transition-all duration-500" />
    <div className="absolute -top-10 -right-4 text-[13rem] font-black text-slate-50 italic select-none group-hover:text-blue-50/50 transition-colors pointer-events-none">{number}</div>
    <div className="relative z-10">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white md:h-20 md:w-20">{icon}</div>
      <h3 className="mb-5 text-2xl font-black uppercase italic tracking-tighter text-blue-950 md:text-3xl">{title}</h3>
      <p className="mb-8 min-h-[48px] text-sm font-bold italic leading-relaxed text-slate-500 md:text-base">{description}</p>
      <div className="mb-9 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {features.map((f: string) => (
          <div key={f} className="flex items-center gap-3">
            <CheckCircle2 size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-950/60 italic leading-none">{f}</span>
          </div>
        ))}
      </div>
      <button onClick={onCtaClick} className="flex items-center gap-4 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] hover:gap-6 transition-all">{cta} <ArrowRight size={18} /></button>
    </div>
  </motion.div>
);

export default Services;
