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
          category: config.category || 'Standard',
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
      category: 'Standard',
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
      <section className="relative py-8 sm:py-12 md:py-16 bg-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg} 
            alt={tPublic('loansHeroAlt', 'Financial Excellence')} 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-blue-900/80 mix-blend-multiply" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">{tPublic('loansHeroTitle', 'Empower Your Financial Future')}</h1>
            <p className="text-xs sm:text-base md:text-lg text-blue-100 mb-4 sm:mb-6 leading-normal sm:leading-relaxed">
              {tPublic('loansHeroDescription', 'Explore our diverse financing options with live minimum/maximum loan bounds, competitive interest rates, and flexible tenure terms tailored for you.')}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <Button size="sm" className="bg-white text-blue-900 hover:bg-gray-100 text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2" onClick={() => navigate('/loan-apply')}>
                {tPublic('loansStartApplication', 'Start Loan Application')}
              </Button>
              <Button size="sm" variant="outline" className="w-full sm:w-auto bg-transparent text-white border border-white font-bold hover:bg-white hover:text-blue-900 text-xs px-3 py-1.5 sm:px-4 sm:py-2 transition-all" onClick={() => navigate('/contact')}>
                {tPublic('loansTalkAdvisor', 'Talk to an Advisor')}
              </Button>
            </div>
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

      {/* 2.5 FEATURED CMS LOAN PRODUCTS */}
      {cmsLoanProducts.length > 0 && (
        <section className="py-10 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Featured Financing Options
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-blue-950 uppercase italic tracking-tighter mt-3 mb-2">
                Our Loan Products
              </h2>
              <p className="text-slate-600 font-medium text-xs sm:text-sm">
                Discover our specialized lending programs configured directly in Content Admin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cmsLoanProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative flex flex-col justify-between overflow-hidden border-2 border-slate-100 hover:border-blue-600 rounded-xl bg-white p-5 shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-bl-full group-hover:bg-blue-600/10 transition-colors duration-300" />
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-black text-blue-950 uppercase italic tracking-tighter leading-none">
                        {product.name}
                      </h3>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div>
                        <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 italic">Purpose</h4>
                        <p className="text-slate-600 font-bold italic text-xs leading-relaxed line-clamp-3">
                          {product.purpose}
                        </p>
                      </div>

                      {product.suited && (
                        <div>
                          <h4 className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 italic">Suited For</h4>
                          <p className="text-slate-500 font-bold italic text-xs">
                            {product.suited}
                          </p>
                        </div>
                      )}

                      {product.docs && (
                        <div className="pt-2 border-t border-slate-50">
                          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">Required Documents</h4>
                          <div className="flex flex-wrap gap-1">
                            {product.docs.split(',').map((doc) => (
                              <span key={doc} className="bg-slate-50 border border-slate-100 text-slate-600 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                                {doc.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 relative z-10">
                    <div className="grid grid-cols-3 gap-1 text-center mb-3">
                      <div className="bg-slate-50 p-1.5 rounded-lg">
                        <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Max Amount</span>
                        <span className="text-[9px] font-black text-blue-950">{product.maxAmount || 'Flexible'}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg">
                        <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Interest</span>
                        <span className="text-[9px] font-black text-emerald-700">{product.interestRate || 'Standard'}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg">
                        <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Max Term</span>
                        <span className="text-[9px] font-black text-slate-700">{product.maxTerm || 'Flexible'}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-blue-950 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] h-9 shadow transition-all"
                      onClick={() => navigate(`/loan-apply?type=${product.name}`)}
                    >
                      Apply Now <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

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

          <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-950 text-white text-[9px] sm:text-xs font-black uppercase tracking-wider border-b border-blue-900">
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5">{tPublic('loanTypeCol', 'Loan Type')}</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5">{tPublic('categoryCol', 'Category')}</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right whitespace-nowrap">{tPublic('loanRangeCol', 'Loan Range')}</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right whitespace-nowrap">{tPublic('tenureCol', 'Tenure')}</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center whitespace-nowrap">{tPublic('interestRateCol', 'Interest')}</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center">{tPublic('actionCol', 'Action')}</th>
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
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 font-semibold text-blue-700 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-blue-700 border border-blue-100">
                          {item.category || 'Standard'}
                        </span>
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
                          {tPublic('applyNow', 'Apply')} <ArrowRight className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {loansList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 font-medium text-xs">
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

      {/* Benefits Section */}
      <section className="py-10 sm:py-16 md:py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">{tPublic('loansWhyBorrowTitle', 'Why Borrow with Zemen?')}</h2>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Briefcase className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900">{tPublic('loansBenefitRatesTitle', 'Competitive Interest Rates')}</h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{tPublic('loansBenefitRatesDescription', 'We offer highly competitive borrowing rates designed to help you succeed rather than burden you with debt.')}</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900">{tPublic('loansBenefitFlexibleTitle', 'Flexible Repayment Terms')}</h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{tPublic('loansBenefitFlexibleDescription', 'Our loan structures are tailored to fit your income cycles with flexible tenures and manageable installment plans.')}</p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <ArrowRight className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900">{tPublic('loansBenefitProcessTitle', 'Streamlined Approval Process')}</h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{tPublic('loansBenefitProcessDescription', 'Our digital application and fast review system ensures you receive funds precisely when you need them.')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-200 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-white rounded-full shadow-sm mb-3 sm:mb-6">
                <Briefcase className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">{tPublic('loansCtaTitle', 'Unlock Your Goals')}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                {tPublic('loansCtaDescription', 'Start your application online today and get matched with the perfect financing program for your needs.')}
              </p>
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold py-2" onClick={() => navigate('/loan-apply')}>
                {tPublic('applyNow', 'Apply Now')} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
