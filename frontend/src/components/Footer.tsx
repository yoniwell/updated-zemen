import React from 'react';
import { 
  Phone, MapPin, Mail, 
   Send, ShieldCheck, 
  ChevronUp, Globe, 
  
} from 'lucide-react';
import { FaTiktok } from "react-icons/fa";
import { Page } from '../App';
import { fetchPublicBranches, type PublicBranch } from '@/lib/publicContentApi';
import { useNavigate, Link } from 'react-router-dom';


// 🔥 IMPORT LANGUAGE SYSTEM
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/translations';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { publicRouteMap } from '@/lib/publicRoutes';

interface FooterProps {
  onNavigate: (page: Page) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = translations[lang];
  const tUi = usePublicUiI18n();
  const [cmsBranches, setCmsBranches] = React.useState<PublicBranch[]>([]);
  const [supportLines, setSupportLines] = React.useState<Array<{ name: string; number: string }>>([]);

  React.useEffect(() => {
    let mounted = true;
    void fetchPublicBranches()
      .then((result) => {
        if (!mounted) return;
        if (Array.isArray(result.branches) && result.branches.length > 0) {
          setCmsBranches(result.branches);
        }
        const namedContacts = Array.isArray(result.phoneContacts) ? result.phoneContacts.filter((c) => Boolean(c?.number?.trim())) : [];
        const legacyNumbers = Array.isArray(result.phoneNumbers) ? result.phoneNumbers : [];

        if (namedContacts.length > 0) {
          setSupportLines(namedContacts.map((c, i) => ({ name: c.name?.trim() || `Branch ${i + 1}`, number: c.number.trim() })));
        } else if (legacyNumbers.length > 0) {
          setSupportLines(legacyNumbers.map((num, i) => ({ name: `Branch ${i + 1}`, number: num })));
        }
      })
      .catch(() => {
        // Keep empty fallback — footer will render nothing when branches unavailable
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleNav = (page: Page) => {
    navigate(publicRouteMap[page]);
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const socialLinks = [
  
  { icon: FaTiktok, url: "https://tiktok.com/@zemensaving" },
  { icon: Send, url: "https://t.me/zemensaving1" }, // 
];
   
  return (
    <footer className="bg-[#f8fafc] text-slate-900 pt-24 pb-8 overflow-hidden relative border-t border-blue-100">

      {/* Soft Blue Glow Effect */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          
          {/* 1. BRAND & FOOTPRINT */}
          <div className="flex flex-col gap-6">
            <button onClick={() => handleNav('home')} className="w-fit">
              <img 
                src="/zemen-logo.png" 
                alt="Zemen Logo" 
                className="h-20 object-contain" 
              />
            </button>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 flex items-center gap-2">
                <Globe size={12} /> {tUi('regional Foot print')}
              </h4>
              <ul className="text-slate-500 font-bold italic text-xs space-y-1 uppercase tracking-tighter max-h-32 overflow-y-auto pr-1">
                {cmsBranches.map((b) => (
                  <li key={b.id}>• {b.name}</li>
                ))}
              </ul>
            </div>
          <div className="flex gap-3 pt-2">
  {socialLinks.map((item, i) => {
    const Icon = item.icon;
    return (
      <a
        key={i}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 flex items-center justify-center bg-blue-100/50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all border border-blue-200"
      >
        <Icon size={16} />
      </a>
    );
  })}
</div>
          </div>

          {/* 2. NAVIGATION LINKS */}
          <div className="flex flex-col gap-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600">{tUi('explore')}</h4>
            <nav className="flex flex-col gap-4">
              {[
                { name: t.home, id: 'home' },
                { name: t.services, id: 'services' },
                { name: t.loans, id: 'loans' },
                { name: t.news, id: 'news' },
                { name: t.contact, id: 'contact' },
              ].map((link: { name: string; id: Page }) => (
                <button 
                  key={link.id}
                  onClick={() => handleNav(link.id)}
                  className="text-slate-600 hover:text-blue-700 font-bold italic text-[13px] uppercase tracking-widest text-left flex items-center gap-3 group transition-all"
                >
                  <span className="w-0 h-[1px] bg-blue-600 group-hover:w-4 transition-all" />
                  {link.name}
                </button>
              ))}
            </nav>
          </div>

          {/* 3. MULTI-PHONE CONTACT HUB */}
          <div className="flex flex-col gap-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600">{tUi('contactHub')}</h4>
            <div className="flex flex-col gap-6">
              <div className="flex gap-4 items-start">
                <MapPin className="text-blue-600 mt-1" size={18} />
                <div>
                  <p className="text-[13px] font-black uppercase italic tracking-tighter text-slate-900 leading-tight">Hawezien Adebaby</p>
                  <p className="text-[11px] text-slate-500 font-bold">Mekelle, Tigray, Ethiopia</p>
                </div>
              </div>
              <div className="flex gap-4 items-start border-t border-blue-50 pt-4">
                <Phone className="text-blue-600 mt-1" size={18} />
                <div className="grid grid-cols-1 gap-1">
                  {supportLines.map((line) => (
                    <p key={`${line.number}-${line.name}`} className="text-[12px] font-bold text-slate-500 tracking-tight">{line.name}: {line.number}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. OFFICIAL EMAIL & COMPLIANCE */}
          <div className="flex flex-col gap-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600">{tUi('institutional')}</h4>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center bg-white p-4 border border-blue-100 shadow-sm">
                <Mail className="text-blue-600" size={18} />
                <div className="flex flex-col">
                   <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Official Email</span>
                   <a href="mailto:info@zemensacco.com" className="text-[12px] font-black uppercase italic tracking-tighter text-slate-900 hover:text-blue-600 transition-colors">
                     info@zemensacco.com
                   </a>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100">
                <ShieldCheck size={20} className="text-blue-600" />
                <span className="text-[9px] font-black uppercase tracking-widest leading-tight text-slate-500">
                  {tUi('regulatedVerified')}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION */}
        <div className="pt-8 border-t border-blue-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center md:text-left">
            © 2026 Zemen saving and credit cooperative. All rights reserved.
          </p>
           <Link to="https://hidyat.com/" className=" text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center md:text-left hover:text-blue-600 transition-colors">
           Developed by Hidiyat general trading </Link>

          <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">{tUi('privacyPolicy')}</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">{tUi('terms')}</Link>
            <Link to="/consent-disclosure" className="hover:text-blue-600 transition-colors">{tUi('consent')}</Link>
          </div>
          
          <button 
            onClick={scrollToTop}
            className="group flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-blue-600 transition-colors"
          >
            {tUi('backToTop')} <ChevronUp size={14} className="group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
}
