import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  PiggyBank, 
  Wallet, 
  TrendingUp, 
  ShieldCheck, 
  Baby, 
  Building2,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Page } from '../App';
import heroImg from '@/assets/photo_2026-04-08_17-03-50.jpg';
import { fetchPublicSavings, type PublicSaving } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';

interface SavingsProps {
  onNavigate: (page: Page) => void;
}



export default function Savings({ onNavigate }: SavingsProps) {
  const { tPublic } = usePublicUiI18n();
  const [cmsServices, setCmsServices] = useState<PublicSaving[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSavingsServices = async () => {
      try {
        const services = await fetchPublicSavings();
        if (mounted) setLoadFailed(false);
        if (mounted) setCmsServices(services);
      } catch {
        if (mounted) {
          setLoadFailed(true);
          setCmsServices([]);
        }
      }
    };

    void loadSavingsServices();

    return () => {
      mounted = false;
    };
  }, []);

  const savingsProducts = useMemo(() => {
    if (loadFailed) {
      return [];
    }

    return cmsServices
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((service, index) => ({
        icon: index % 6 === 0 ? <PiggyBank className="h-8 w-8 text-blue-600" /> :
          index % 6 === 1 ? <TrendingUp className="h-8 w-8 text-blue-600" /> :
          index % 6 === 2 ? <Baby className="h-8 w-8 text-blue-600" /> :
          index % 6 === 3 ? <Building2 className="h-8 w-8 text-blue-600" /> :
          index % 6 === 4 ? <Wallet className="h-8 w-8 text-blue-600" /> :
          <ShieldCheck className="h-8 w-8 text-blue-600" />,
        title: service.title,
        description: service.description,
          features: service.features.length ? service.features : [tPublic('savingsDetailsOnRequest', 'Details available on request')],
      }));
        }, [cmsServices, loadFailed, tPublic]);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="relative py-20 bg-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg} 
            alt={tPublic('savingsHeroAlt', 'Savings at Zemen')} 
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{tPublic('savingsHeroTitle', 'Grow Your Wealth Sustainably')}</h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              {tPublic('savingsHeroDescription', 'Whether you are saving for a rainy day, your next big purchase, or a secure retirement, Zemen SACCO offers a range of high-yield, secure savings products tailored to your goals.')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-white text-blue-900 hover:bg-gray-100" onClick={() => onNavigate('apply')}>
                {tPublic('savingsStartToday', 'Start Saving Today')}
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-2 border-white font-bold hover:bg-white hover:text-blue-900 transition-all" onClick={() => onNavigate('contact')}>
                {tPublic('savingsTalkAdvisor', 'Talk to an Advisor')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Savings Products Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{tPublic('savingsProductsTitle', 'Our Savings Products')}</h2>
            <p className="text-lg text-gray-600">
              {tPublic('savingsProductsDescription', 'Discover the perfect savings strategy to match your financial goals and timeframe. All our accounts offer institutional-grade security and competitive returns.')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savingsProducts.map((product, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-gray-200">
                  <CardHeader>
                    <div className="mb-4 bg-blue-50 w-16 h-16 rounded-xl flex items-center justify-center">
                      {product.icon}
                    </div>
                    <CardTitle className="text-xl">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-6 min-h-[80px]">
                      {product.description}
                    </p>
                    <ul className="space-y-3 mb-6">
                      {product.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{tPublic('savingsWhySaveTitle', 'Why Save with Zemen?')}</h2>
              <div className="space-y-6">
                <div className="flex">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{tPublic('savingsBenefitReturnsTitle', 'Above-Market Returns')}</h3>
                    <p className="mt-2 text-gray-600">{tPublic('savingsBenefitReturnsDescription', 'We distribute our profits back to our members in the form of higher interest rates and annual dividends.')}</p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{tPublic('savingsBenefitSecurityTitle', 'Institutional Security')}</h3>
                    <p className="mt-2 text-gray-600">{tPublic('savingsBenefitSecurityDescription', 'Your deposits are managed with strict compliance to SACCO regulatory guidelines and rigorous internal audits.')}</p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Wallet className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{tPublic('savingsBenefitLoanPowerTitle', 'Unlocks Loan Multipliers')}</h3>
                    <p className="mt-2 text-gray-600">{tPublic('savingsBenefitLoanPowerDescription', 'Your compulsory savings balance directly determines your borrowing power, unlocking loans of up to 3x your savings.')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-sm mb-6">
                <TrendingUp className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{tPublic('savingsCtaTitle', 'Start Earning Dividends')}</h3>
              <p className="text-gray-600 mb-8">
                {tPublic('savingsCtaDescription', 'Become a member today to open your savings account and start earning competitive interest rates while building your credibility for future loans.')}
              </p>
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onNavigate('apply')}>
                {tPublic('becomeMember', 'Become a Member')} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
