import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Briefcase, 
  HeartPulse, 
  User, 
  FileText, 
  Users, 
  Settings,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Page } from '../App';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchPublicLoanProducts, type PublicLoanProduct } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';

// Asset: provided hero image
import heroImg from '@/assets/photo_2026-04-08_17-03-50.jpg';

interface LoansProps {
  onNavigate: (page: Page) => void;
}



const inferLoanType = (name: string): string => {
  const value = name.toLowerCase();
  if (value.includes('business') || value.includes('trade')) return 'BUSINESS';
  if (value.includes('emergency')) return 'EMERGENCY';
  if (value.includes('asset') || value.includes('equipment')) return 'ASSET';
  if (value.includes('group')) return 'GROUP';
  if (value.includes('salary') || value.includes('development')) return 'DEVELOPMENT';
  return 'PERSONAL';
};

export default function Loans({ onNavigate }: LoansProps) {
  const { tPublic } = usePublicUiI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isServiceView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('view') === 'service';
  }, [location.search]);
  const [cmsLoanProducts, setCmsLoanProducts] = useState<PublicLoanProduct[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadLoanProducts = async () => {
      try {
        const data = await fetchPublicLoanProducts();
        if (mounted) setCmsLoanProducts(data);
      } catch {
        if (mounted) setCmsLoanProducts([]);
      }
    };

    void loadLoanProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const loanProducts = useMemo(() => {
    if (!cmsLoanProducts.length) {
      return [];
    }
    return cmsLoanProducts
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((loan, index) => ({
        icon: index % 6 === 0 ? <User className="h-8 w-8 text-blue-600" /> :
          index % 6 === 1 ? <Briefcase className="h-8 w-8 text-blue-600" /> :
          index % 6 === 2 ? <FileText className="h-8 w-8 text-blue-600" /> :
          index % 6 === 3 ? <HeartPulse className="h-8 w-8 text-blue-600" /> :
          index % 6 === 4 ? <Settings className="h-8 w-8 text-blue-600" /> :
          <Users className="h-8 w-8 text-blue-600" />,
        title: loan.name,
        purpose: loan.purpose,
        target: loan.suited,
        type: inferLoanType(loan.name),
        requirements: loan.docs.split(',').map((item) => item.trim()).filter(Boolean),
      }));
  }, [cmsLoanProducts, tPublic]);

  const displayedLoanProducts = loanProducts;

  if (isServiceView) {
    return (
      <div className="animate-in fade-in duration-500">
        <section className="relative py-16 md:py-20 bg-blue-900 text-white overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={heroImg}
              alt={tPublic('loansServiceHeroAlt', 'Loan services at Zemen')}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-blue-900/80 mix-blend-multiply" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">{tPublic('loansServiceHeroTitle', 'Loan Services')}</h1>
              <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-8 leading-relaxed">
                {tPublic('loansServiceHeroDescription', 'Explore focused loan options with only the most essential information.')}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-white text-blue-900 hover:bg-gray-100" onClick={() => navigate('/loan-apply')}>
                  {tPublic('loansStartApplication', 'Start Loan Application')}
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-white hover:bg-white/10" onClick={() => onNavigate('contact')}>
                  {tPublic('loansServiceTalkAdvisor', 'Talk to a Loan Advisor')}
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{tPublic('loansServiceProductsTitle', 'Our Loan Services')}</h2>
              <p className="text-lg text-gray-600">
                {tPublic('loansServiceProductsDescription', 'Key loan services presented in a simplified format so you can choose quickly.')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedLoanProducts.map((loan, index) => (
                <motion.div
                  key={loan.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow border-gray-200">
                    <CardHeader>
                      <div className="mb-4 bg-blue-50 w-16 h-16 rounded-xl flex items-center justify-center">
                        {loan.icon}
                      </div>
                      <CardTitle className="text-lg sm:text-xl">{loan.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-2">
                        {loan.purpose}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-white">
      
      {/* 1. BRIGHT HERO SECTION WITH UNNAMED (3) */}
      <section className="relative overflow-hidden bg-white py-20 md:py-24 lg:py-32">
        <img 
          src={heroImg} 
          className="absolute inset-0 w-full h-full object-cover opacity-60 contrast-125 brightness-110" 
          alt={tPublic('loansHeroAlt', 'Financial Excellence')} 
        />
        {/* Light Gradient Overlay for Text Protection */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        
        <div className="container relative z-10 mx-auto px-5 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.35em] text-blue-700 drop-shadow-sm sm:mb-6 sm:text-[12px] sm:tracking-[0.8em]">
              {tPublic('loansHeroKicker', 'Empowering Your Future')}
            </span>
            <h1 className="mb-6 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-blue-950 drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)] sm:mb-8 sm:text-5xl lg:text-7xl">
              Loan <span className="text-transparent" style={{ WebkitTextStroke: '2px #172554' }}>Products</span>
            </h1>
            <p className="mb-8 max-w-xl text-base font-bold italic leading-relaxed text-slate-800 drop-shadow-sm sm:mb-10 sm:text-xl">
              {tPublic('loansHeroDescription', 'Explore our diverse financing options tailored for personal, business, and community growth.')}
            </p>
            <Button 
              size="lg" 
              className="h-12 w-full bg-blue-700 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-blue-950 sm:h-14 sm:w-auto sm:px-10 sm:text-sm"
              onClick={() => navigate('/loan-apply')}
            >
              {tPublic('loansStartApplication', 'Start Loan Application')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 2. IMPORTANT NOTICE BAR */}
      <div className="bg-amber-50 border-y border-amber-100 py-3 md:py-4">
        <div className="container mx-auto flex items-center justify-center gap-2 px-5 sm:gap-3 sm:px-6">
          <AlertCircle className="text-amber-600 h-5 w-5" />
          <p className="text-center text-[10px] font-black uppercase italic tracking-wide text-amber-800 sm:text-xs md:text-sm">
            {tPublic('loansNoticeReviewVerification', 'Notice: Every application is subject to review, verification, and formal approval.')}
          </p>
        </div>
      </div>

      {/* 3. LOAN PRODUCTS GRID */}
      <section className="container mx-auto px-5 py-14 sm:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
          {loanProducts.map((loan, index) => (
            <motion.div
              key={loan.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-slate-100 shadow-xl hover:border-blue-600 transition-all duration-500 group relative overflow-hidden bg-white">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -mr-10 -mt-10 group-hover:bg-blue-600 transition-colors duration-500" />
                
                <CardHeader className="relative z-10">
                  <div className="bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {loan.icon}
                  </div>
                  <CardTitle className="text-xl font-black text-blue-950 uppercase italic tracking-tighter leading-none md:text-2xl">
                    {loan.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="relative z-10 space-y-5">
                  <div>
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 italic">{tPublic('loansPurposeLabel', 'Purpose')}</h4>
                    <p className="text-slate-600 font-bold italic text-sm leading-relaxed">{loan.purpose}</p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 italic">{tPublic('loansTargetUserLabel', 'Target User')}</h4>
                    <p className="text-slate-500 font-bold italic text-sm">{loan.target}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 italic">{tPublic('loansRequiredDocumentsLabel', 'Required Documents')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {loan.requirements.map((req) => (
                        <span key={req} className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2 py-1 rounded">
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="mt-3 h-11 w-full bg-blue-950 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700"
                    onClick={() => navigate(`/loan-apply?type=${loan.type}`)}
                  >
                    {tPublic('applyNow', 'Apply Now')} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      
    </div>
  );
}
