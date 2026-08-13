import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Page } from '../App';
import heroImg from '@/assets/photo_2026-04-08_17-03-50.jpg';
import { fetchPublicSavings, fetchConfigSavingTypes, type PublicSaving, type ConfigSavingType } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { ArrowRight, Coins, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';

interface SavingsProps {
  onNavigate: (page: Page) => void;
}

export default function Savings({ onNavigate }: SavingsProps) {
  const { tPublic } = usePublicUiI18n();
  const [cmsServices, setCmsServices] = useState<PublicSaving[]>([]);
  const [configTypes, setConfigTypes] = useState<ConfigSavingType[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSavingsServices = async () => {
      try {
        const [services, types] = await Promise.all([
          fetchPublicSavings().catch(() => []),
          fetchConfigSavingTypes().catch(() => []),
        ]);
        if (mounted) {
          setLoadFailed(false);
          setCmsServices(services);
          setConfigTypes(types);
        }
      } catch {
        if (mounted) {
          setLoadFailed(true);
          setCmsServices([]);
          setConfigTypes([]);
        }
      }
    };

    void loadSavingsServices();

    return () => {
      mounted = false;
    };
  }, []);

  const savingsList = useMemo(() => {
    if (loadFailed && !configTypes.length && !cmsServices.length) {
      return [];
    }

    if (configTypes.length > 0) {
      return configTypes.map((config) => ({
        id: config.id,
        name: config.name,
        minAmount: config.minAmount ?? null,
        maxAmount: config.maxAmount ?? null,
        membershipFee: config.membershipFee ?? null,
      }));
    }

    return cmsServices.map((service) => ({
      id: service.id,
      name: service.title,
      minAmount: null,
      maxAmount: null,
      membershipFee: null,
    }));
  }, [cmsServices, configTypes, loadFailed]);

  return (
    <div className="animate-in fade-in duration-500 bg-white">
      {/* Hero Section */}
      <section className="relative py-8 sm:py-12 md:py-16 bg-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg} 
            alt={tPublic('savingsHeroAlt', 'Savings at Zemen')} 
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
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">{tPublic('savingsHeroTitle', 'Grow Your Wealth Sustainably')}</h1>
            <p className="text-xs sm:text-base md:text-lg text-blue-100 mb-4 sm:mb-6 leading-normal sm:leading-relaxed">
              {tPublic('savingsHeroDescription', 'Whether you are saving for a rainy day, your next big purchase, or a secure retirement, Zemen SACCO offers a range of high-yield, secure savings products tailored to your goals.')}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <Button size="sm" className="bg-white text-blue-900 hover:bg-gray-100 text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2" onClick={() => onNavigate('apply')}>
                {tPublic('savingsStartToday', 'Start Saving Today')}
              </Button>
              <Button size="sm" variant="outline" className="w-full sm:w-auto bg-transparent text-white border border-white font-bold hover:bg-white hover:text-blue-900 text-xs px-3 py-1.5 sm:px-4 sm:py-2 transition-all" onClick={() => onNavigate('contact')}>
                {tPublic('savingsTalkAdvisor', 'Talk to an Advisor')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ultra-Compact Savings Types Table Section */}
      <section className="py-6 sm:py-10 md:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-blue-950 uppercase italic tracking-tighter mb-1 sm:mb-2">
              Saving Types & Deposit Rates
            </h2>
            <p className="text-slate-600 font-medium text-[11px] sm:text-xs md:text-sm">
              Live updated list of saving accounts configured in system settings.
            </p>
          </div>

          {/* COMPACT TABLE CONTAINER */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-950 text-white text-[9px] sm:text-xs font-black uppercase tracking-wider border-b border-blue-900">
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5">Saving Type</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right whitespace-nowrap">Membership Fee</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right whitespace-nowrap">Min Payment</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right whitespace-nowrap">Max Limit</th>
                    <th className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs md:text-sm">
                  {savingsList.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 font-black text-blue-950 whitespace-nowrap">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="p-1 sm:p-1.5 bg-blue-50 text-blue-700 rounded group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right font-extrabold text-blue-950 whitespace-nowrap">
                        {item.membershipFee != null ? `${item.membershipFee.toLocaleString()} ETB` : '500 ETB'}
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right font-extrabold text-blue-900 whitespace-nowrap">
                        {item.minAmount != null ? `${item.minAmount.toLocaleString()} ETB` : 'Flexible'}
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {item.maxAmount != null ? `${item.maxAmount.toLocaleString()} ETB` : 'No Limit'}
                      </td>
                      <td className="py-2.5 px-3 sm:py-3.5 sm:px-5 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => onNavigate('apply')}
                          className="bg-blue-600 hover:bg-blue-950 text-white font-bold text-[9px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded transition-all shadow"
                        >
                          Apply <ArrowRight className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {savingsList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-medium text-xs">
                        Loading saving types...
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
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">{tPublic('savingsWhySaveTitle', 'Why Save with Zemen?')}</h2>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900">{tPublic('savingsBenefitReturnsTitle', 'Above-Market Returns')}</h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{tPublic('savingsBenefitReturnsDescription', 'We distribute our profits back to our members in the form of higher interest rates and annual dividends.')}</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <ShieldCheck className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900">{tPublic('savingsBenefitSecurityTitle', 'Institutional Security')}</h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{tPublic('savingsBenefitSecurityDescription', 'Your deposits are managed with strict compliance to SACCO regulatory guidelines and rigorous internal audits.')}</p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Wallet className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900">{tPublic('savingsBenefitLoanPowerTitle', 'Unlocks Loan Multipliers')}</h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{tPublic('savingsBenefitLoanPowerDescription', 'Your compulsory savings balance directly determines your borrowing power, unlocking loans of up to 3x your savings.')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-200 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-white rounded-full shadow-sm mb-3 sm:mb-6">
                <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">{tPublic('savingsCtaTitle', 'Start Earning Dividends')}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                {tPublic('savingsCtaDescription', 'Become a member today to open your savings account and start earning competitive interest rates while building your credibility for future loans.')}
              </p>
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold py-2" onClick={() => onNavigate('apply')}>
                {tPublic('becomeMember', 'Become a Member')} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
