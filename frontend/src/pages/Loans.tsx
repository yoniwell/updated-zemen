import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Page } from '../App';
import { useNavigate } from 'react-router-dom';
import { 
  fetchPublicLoanProducts, 
  fetchConfigLoanTypes, 
  type PublicLoanProduct, 
  type ConfigLoanType 
} from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { AlertCircle, ArrowRight, Briefcase } from 'lucide-react';

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

  const [cmsLoanProducts, setCmsLoanProducts] = useState<PublicLoanProduct[]>([]);
  const [configTypes, setConfigTypes] = useState<ConfigLoanType[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadLoanProducts = async () => {
      try {
        const [cmsData, configData] = await Promise.all([
          fetchPublicLoanProducts().catch(() => []),
          fetchConfigLoanTypes().catch(() => []),
        ]);
        if (mounted) {
          setCmsLoanProducts(cmsData);
          setConfigTypes(configData);
        }
      } catch {
        if (mounted) {
          setCmsLoanProducts([]);
          setConfigTypes([]);
        }
      }
    };

    void loadLoanProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const loansList = useMemo(() => {
    if (configTypes.length > 0) {
      return configTypes.map((config) => {
        const matchedCms = cmsLoanProducts.find(
          (c) => c.name.toLowerCase().trim() === config.name.toLowerCase().trim()
        );

        return {
          id: config.id,
          name: config.name,
          type: inferLoanType(config.name),
          interestRate: matchedCms?.interestRate || 'Standard Rate',
          minAmount: config.minAmount ?? null,
          maxAmount: config.maxAmount ?? (matchedCms?.maxAmount ? parseInt(matchedCms.maxAmount, 10) : null),
          minTenure: config.minTenure ?? null,
          maxTenure: config.maxTenure ?? (matchedCms?.maxTerm ? parseInt(matchedCms.maxTerm, 10) : null),
        };
      });
    }

    return cmsLoanProducts.map((loan) => ({
      id: loan.id,
      name: loan.name,
      type: inferLoanType(loan.name),
      interestRate: loan.interestRate || 'Standard Rate',
      minAmount: null,
      maxAmount: loan.maxAmount ? parseInt(loan.maxAmount, 10) : null,
      minTenure: null,
      maxTenure: loan.maxTerm ? parseInt(loan.maxTerm, 10) : null,
    }));
  }, [cmsLoanProducts, configTypes]);

  return (
    <div className="bg-white animate-in fade-in duration-500">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-white py-10 sm:py-16 md:py-24">
        <img 
          src={heroImg} 
          className="absolute inset-0 w-full h-full object-cover opacity-60 contrast-125 brightness-110" 
          alt={tPublic('loansHeroAlt', 'Financial Excellence')} 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
        
        <div className="container relative z-10 mx-auto px-3 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-blue-700 sm:mb-4 sm:text-[11px] sm:tracking-[0.6em]">
              {tPublic('loansHeroKicker', 'Empowering Your Future')}
            </span>
            <h1 className="mb-3 text-2xl font-black uppercase italic leading-[0.95] tracking-tighter text-blue-950 sm:mb-6 sm:text-4xl lg:text-6xl">
              Loan <span className="text-transparent" style={{ WebkitTextStroke: '2px #172554' }}>Products</span>
            </h1>
            <p className="mb-4 max-w-xl text-xs font-bold italic leading-relaxed text-slate-800 sm:mb-8 sm:text-lg">
              {tPublic('loansHeroDescription', 'Explore our diverse financing options with live minimum/maximum loan bounds, interest rates, and flexible tenure terms.')}
            </p>
            <Button 
              size="sm" 
              className="h-9 w-full bg-blue-700 px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg sm:h-12 sm:w-auto sm:px-8 sm:text-xs"
              onClick={() => navigate('/loan-apply')}
            >
              {tPublic('loansStartApplication', 'Start Loan Application')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 2. IMPORTANT NOTICE BAR */}
      <div className="bg-amber-50 border-y border-amber-100 py-2 sm:py-3">
        <div className="container mx-auto flex items-center justify-center gap-1.5 px-3 sm:px-6">
          <AlertCircle className="text-amber-600 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <p className="text-center text-[9px] font-black uppercase italic tracking-wide text-amber-800 sm:text-xs">
            {tPublic('loansNoticeReviewVerification', 'Notice: Every application is subject to review, verification, and formal approval.')}
          </p>
        </div>
      </div>

      {/* 3. LOAN TYPES ULTRA-COMPACT DATA TABLE */}
      <section className="py-6 sm:py-10 md:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-blue-950 uppercase italic tracking-tighter mb-1 sm:mb-2">
              Loan Types & Terms Table
            </h2>
            <p className="text-slate-600 font-medium text-[11px] sm:text-xs md:text-sm">
              Live updated list of loan types, borrowing limits, interest rates, and repayment terms.
            </p>
          </div>

          {/* COMPACT RESPONSIVE TABLE CONTAINER */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-950 text-white text-[9px] sm:text-xs font-black uppercase tracking-wider border-b border-blue-900">
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5">Loan Type</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right whitespace-nowrap">Loan Range</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right whitespace-nowrap">Tenure</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center whitespace-nowrap">Interest</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs md:text-sm">
                  {loansList.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 font-black text-blue-950 whitespace-nowrap">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="p-1 sm:p-1.5 bg-blue-50 text-blue-700 rounded group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right font-extrabold text-blue-900 whitespace-nowrap">
                        {item.minAmount ? `${item.minAmount.toLocaleString()} ETB` : 'Min 1k'} – {item.maxAmount ? `${item.maxAmount.toLocaleString()} ETB` : 'Flexible'}
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right font-extrabold text-slate-800 whitespace-nowrap">
                        {item.minTenure ? `${item.minTenure} - ` : ''}{item.maxTenure ? `${item.maxTenure} Mos` : 'Custom'}
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center font-extrabold text-emerald-700 whitespace-nowrap">
                        {item.interestRate}
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/loan-apply?type=${item.type}`)}
                          className="bg-blue-950 hover:bg-blue-800 text-white font-bold text-[9px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded transition-all shadow"
                        >
                          Apply <ArrowRight className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {loansList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-medium text-xs">
                        Loading loan types...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
