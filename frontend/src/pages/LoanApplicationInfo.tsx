import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Wallet, 
  FileCheck, 
  Landmark, 
  ShieldCheck, 
  AlertTriangle,
  Briefcase,
  ArrowRight,
  Info,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Page } from '../App';
import { useNavigate } from 'react-router-dom';
import { usePublicUiI18n } from '@/lib/uiI18n';

// Asset: provided hero image - same one for consistency or a related one
import heroImg from '@/assets/photo_2026-04-08_17-03-50.jpg';

interface LoanApplicationInfoProps {
  onNavigate?: (page: Page) => void;
}

export default function LoanApplicationInfo({ onNavigate }: LoanApplicationInfoProps) {
  const navigate = useNavigate();
  const { tPublicUi } = usePublicUiI18n();

  const steps: Array<{ icon: LucideIcon; title: string; desc: string }> = [
    { icon: FileCheck, title: tPublicUi('loanFillForm', 'Prepare Documents'), desc: tPublicUi('loanFillFormDesc', 'Download forms and gather ID & marriage certificates.') },
    { icon: Wallet, title: tPublicUi('loanSubmitDetails', 'Submit Request'), desc: tPublicUi('loanSubmitDetailsDesc', 'Enter loan amount, tenure, and collateral details online.') },
    { icon: Landmark, title: tPublicUi('loanCommittee', 'Committee Review'), desc: tPublicUi('loanCommitteeDesc', 'Credit committee assesses your application and credit score.') },
    { icon: ShieldCheck, title: tPublicUi('loanDisbursement', 'Disbursement'), desc: tPublicUi('loanDisbursementDesc', 'Upon approval, funds are securely transferred to your account.') },
  ];

  const eligibleGroups = [
    {
      icon: <CheckCircle2 />,
      title: tPublicUi('activeMembers', 'Active Members'),
      desc: tPublicUi('activeMembersDesc', 'Must have completed the required minimum saving period (typically 6 months).'),
    },
    {
      icon: <Briefcase />,
      title: tPublicUi('salariedEmployees', 'Salaried Employees'),
      desc: tPublicUi('salariedEmployeesDesc', 'Must provide a valid employer guarantee or salary assignment letter.'),
    },
    {
      icon: <CreditCard />,
      title: tPublicUi('businessOwners', 'Business Owners & Traders'),
      desc: tPublicUi('businessOwnersDesc', 'Must provide valid business license and acceptable collateral documentation.'),
    },
  ];

  const requirements = [
    tPublicUi('loanReq1', 'Active membership for at least 6 months with consistent saving history.'),
    tPublicUi('loanReq2', 'Completed loan application form with correct amount and tenure.'),
    tPublicUi('loanReq3', 'Valid national ID, passport, or Kebele ID.'),
    tPublicUi('loanReq4', 'Marriage certificate or legal status document (mandatory).'),
    tPublicUi('loanReq5', 'Sufficient collateral (vehicle, property, or salary guarantee) covering the loan.'),
  ];

  return (
    <div className="bg-white">
      
      {/* 1. HERO SECTION */}
      <section className="relative flex min-h-[56vh] items-center overflow-hidden bg-white pt-14 md:min-h-[62vh] md:pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg} 
            className="w-full h-full object-cover brightness-110 contrast-125 opacity-60" 
            alt="Zemen Loan Application" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        </div>
        
        <div className="container relative z-10 mx-auto px-5 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl px-0 py-6 sm:p-6 md:p-8"
          >
            <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.35em] text-blue-700 drop-shadow-sm sm:mb-6 sm:text-[12px] sm:tracking-[0.8em]">
              {tPublicUi('secureYourFuture', 'Empower Your Financial Goals')}
            </span>
            <h1 className="mb-5 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-blue-950 drop-shadow-sm sm:mb-8 sm:text-5xl lg:text-7xl">
              {tPublicUi('applyForLoan', 'Apply for a Loan')}
            </h1>
            <p className="mb-7 max-w-xl text-base font-bold italic leading-relaxed text-slate-800 drop-shadow-sm sm:mb-10 sm:text-xl">
              {tPublicUi('loanHeroDescription', 'Access flexible financing tailored to your needs. Enjoy competitive interest rates and a transparent digital application process.')}
            </p>
            <Button 
              size="lg" 
              className="h-12 rounded-md bg-blue-950 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-blue-700 sm:h-14 sm:rounded-none sm:px-10 sm:text-sm"
              onClick={() => {
                if (onNavigate) onNavigate('loanInfo' as any);
                navigate('/loan-apply');
              }}
            >
              {tPublicUi('startLoanApplication', 'Start Loan Application')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 2. THE PROCESS (Step Indicator) */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="container mx-auto px-5 sm:px-6">
          <div className="mb-10 text-center md:mb-14">
            <h2 className="mb-4 text-2xl font-black uppercase italic tracking-tighter text-blue-950 md:text-3xl">{tPublicUi('loanProcess', 'Application Process')}</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-4 md:gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="relative group">
                <div className="bg-white p-6 border border-slate-200 text-center shadow-lg transition-all group-hover:border-blue-600 md:p-7">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors md:mb-6 md:h-16 md:w-16">
                    <step.icon size={32} />
                  </div>
                  <h3 className="mb-3 text-base font-black uppercase italic text-blue-950 md:text-lg">{step.title}</h3>
                  <p className="text-slate-500 font-bold italic text-sm">{step.desc}</p>
                </div>
                {idx < 3 && <ArrowRight className="hidden md:block absolute top-1/2 -right-4 text-blue-100 -translate-y-1/2" size={32} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ELIGIBILITY & PRIORITY SEGMENTS */}
      <section className="container mx-auto px-5 py-14 sm:px-6 md:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="mb-6 text-3xl font-black uppercase italic tracking-tighter text-blue-950 md:mb-8 md:text-4xl">{tPublicUi('whoCanBorrow', 'Who Can Borrow?')}</h2>
            <p className="mb-6 text-sm font-bold italic leading-relaxed text-slate-600 md:mb-8 md:text-base">
              {tPublicUi('whoCanBorrowDesc', 'Loans are exclusively available to active members who have demonstrated a strong savings culture and financial responsibility within the cooperative.')}
            </p>
            
            <div className="space-y-4 md:space-y-6">
              {eligibleGroups.map((item, i) => (
                <div key={i} className="flex items-start gap-4 border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:gap-6 md:p-6">
                  <div className="text-blue-600 mt-1">{item.icon}</div>
                  <div>
                    <h4 className="text-sm font-black text-blue-950 uppercase tracking-widest mb-1">{item.title}</h4>
                    <p className="text-slate-500 font-bold italic text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative bg-blue-950 p-6 text-white md:p-8 lg:p-12">
            <h3 className="mb-6 text-xl font-black uppercase italic tracking-tighter md:mb-8 md:text-2xl">{tPublicUi('loanRequirements', 'Key Requirements')}</h3>
            <ul className="space-y-4 md:space-y-6">
              {requirements.map((text, idx) => (
                <li key={idx} className="flex items-start gap-4">
                  <CheckCircle2 className="text-blue-400 shrink-0 mt-1" size={20} />
                  <span className="text-blue-100 font-bold italic text-sm">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-4 border border-white/10 bg-white/5 p-4 md:mt-10 md:p-6">
              <Info className="text-blue-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 leading-relaxed">
                {tPublicUi('collateralNote', 'Note: Collateral evaluation must be completed before funds can be disbursed. Ensure all ownership documents are legally valid.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. GROUNDS FOR REJECTION */}
      <section className="container mx-auto px-5 pb-16 sm:px-6 md:pb-24">
        <div className="border-l-4 border-red-500 bg-red-50 p-6 md:border-l-8 md:p-10">
          <div className="mb-6 flex items-center gap-3 md:gap-4">
            <AlertTriangle className="text-red-500" size={32} />
            <h2 className="text-xl font-black text-blue-950 uppercase italic tracking-tighter md:text-2xl">{tPublicUi('loanRejectionGrounds', 'Grounds for Rejection')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RejectionItem title={tPublicUi('insufficientSavings', 'Insufficient Savings')} desc={tPublicUi('insufficientSavingsDesc', 'Not meeting the minimum required savings balance for the requested loan amount.')} />
            <RejectionItem title={tPublicUi('badCredit', 'Poor Repayment History')} desc={tPublicUi('badCreditDesc', 'Defaulting on previous loans or existing unpaid balances.')} />
            <RejectionItem title={tPublicUi('invalidCollateral', 'Inadequate Collateral')} desc={tPublicUi('invalidCollateralDesc', 'Provided collateral does not cover the loan risk or has disputed ownership.')} />
          </div>
        </div>
      </section>

      {/* 5. FOOTER CALLOUT */}
      <section className="container mx-auto px-5 pb-16 text-center sm:px-6 md:pb-24">
        <div className="group relative overflow-hidden bg-blue-700 p-8 md:p-10 lg:p-16">
          <div className="absolute inset-0 bg-blue-950 opacity-0 group-hover:opacity-20 transition-opacity" />
          <h2 className="relative z-10 mb-6 text-2xl font-black uppercase italic tracking-tighter text-white md:mb-8 md:text-4xl lg:text-5xl">
            {tPublicUi('readyToApply', 'Ready to fund your goals?')}
          </h2>
          <Button 
            size="lg" 
            className="relative z-10 h-12 rounded-md bg-white px-6 text-[11px] font-black uppercase tracking-widest text-blue-700 shadow-2xl transition-all hover:bg-blue-950 hover:text-white sm:h-14 sm:rounded-none sm:px-10 sm:text-sm"
            onClick={() => {
              if (onNavigate) onNavigate('loanInfo' as any);
              navigate('/loan-apply');
            }}
          >
            {tPublicUi('startApplication', 'Start Application')} <ArrowRight className="ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

const RejectionItem = ({ title, desc }: { title: string, desc: string }) => (
  <div>
    <h4 className="text-sm font-black text-red-700 uppercase tracking-widest mb-2 leading-none">{title}</h4>
    <p className="text-slate-600 font-bold italic text-xs leading-relaxed">{desc}</p>
  </div>
);
