import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  UserPlus, 
  Wallet, 
  ArrowRight, 
  Smartphone, 
  ShieldCheck, 
  FileText, 
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePublicUiI18n } from '@/lib/uiI18n';

export default function HowToApply() {
  const navigate = useNavigate();
  const { tPublic } = usePublicUiI18n();

  return (
    <div className="pt-16 pb-32 bg-white">
      <div className="container mx-auto px-6">
        
        {/* HEADER */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-6xl font-black text-blue-950 mb-6 uppercase italic tracking-tighter">
              {tPublic('howToApplyTitlePrefix', 'How to Apply')} <span className="text-blue-600">{tPublic('howToApplyTitleAccent', 'Online')}</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto font-bold italic leading-relaxed">
              {tPublic('howToApplyHeroDescription', 'Experience our streamlined digital process. Download official forms, complete your documents, and submit your application online with instant tracking.')}
            </p>
          </motion.div>
        </div>

        {/* PROMINENT DOWNLOAD FORMS BANNER */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-5xl mx-auto mb-16 p-8 bg-slate-900 text-white rounded-none border-l-8 border-blue-600 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-start gap-5">
            <div className="p-4 bg-blue-600/20 text-blue-400 rounded-none shrink-0 border border-blue-500/30">
              <Download className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                Step 1: Download Required Application Forms First
              </h3>
              <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-2xl">
                Before applying online, visit our <strong className="text-blue-400 font-bold">Downloads Page</strong> to get official PDF application forms, payment proof templates, and policy guidelines. Fill out the required forms and upload them back during the online portal process.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => navigate('/downloads')}
            className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-14 px-8 rounded-none border border-blue-400/50 shadow-lg"
          >
            Go To Downloads Page <ExternalLink className="ml-3 h-4 w-4" />
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* LEFT: MEMBERSHIP */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="flex items-center gap-6 mb-12">
              <div className="bg-blue-600 p-5 rounded-none shadow-[10px_10px_0px_#dbeafe]">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-blue-950 uppercase italic tracking-tighter">
                  {tPublic('becomeMember', 'Become a Member')}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">4-Step Application Guide</p>
              </div>
            </div>

            <div className="space-y-10 border-l-2 border-blue-100 pl-8 ml-6">
              <Step 
                num="01" 
                title={tPublic('howToApplyMemStep1Title', 'Download Official Membership Forms')} 
                desc={tPublic('howToApplyMemStep1Desc', 'Visit our Downloads page to get the official Membership PDF Form and savings agreement templates.')} 
                icon={<Download className="h-4 w-4 text-blue-600" />}
              />
              <Step 
                num="02" 
                title={tPublic('howToApplyMemStep2Title', 'Complete Forms & Personal KYC')} 
                desc={tPublic('howToApplyMemStep2Desc', 'Fill out the downloaded form, prepare your National ID / Passport, personal photo, and payment transaction receipt.')} 
                icon={<FileCheck className="h-4 w-4 text-blue-600" />}
              />
              <Step 
                num="03" 
                title={tPublic('howToApplyMemStep3Title', 'Verify Email & Online Profile')} 
                desc={tPublic('howToApplyMemStep3Desc', 'Open the online Membership Portal, verify email via OTP, select your preferred branch and savings product.')} 
                icon={<Smartphone className="h-4 w-4 text-blue-600" />}
              />
              <Step 
                num="04" 
                title={tPublic('howToApplyMemStep4Title', 'Upload Completed Files & Submit')} 
                desc={tPublic('howToApplyMemStep4Desc', 'Upload personal ID photo and filled application files. Submit to receive your instant reference tracking number.')} 
                icon={<ShieldCheck className="h-4 w-4 text-blue-600" />}
              />
            </div>
            
            <Button 
              size="lg" 
              onClick={() => navigate('/membership-apply')}
              className="w-full bg-blue-600 hover:bg-blue-950 h-20 text-sm font-black uppercase tracking-[0.2em] rounded-none shadow-2xl transition-all"
            >
              {tPublic('becomeMember', 'Become a Member Now')} <ArrowRight className="ml-4 h-5 w-5" />
            </Button>
          </motion.div>

          {/* RIGHT: LOAN */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="flex items-center gap-6 mb-12">
              <div className="bg-blue-950 p-5 rounded-none shadow-[10px_10px_0px_#f1f5f9]">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-blue-950 uppercase italic tracking-tighter">
                  {tPublic('applyLoan', 'Apply Loan')}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">4-Step Application Guide</p>
              </div>
            </div>

            <div className="space-y-10 border-l-2 border-slate-200 pl-8 ml-6">
              <Step 
                num="01" 
                title={tPublic('howToApplyLoanStep1Title', 'Download Loan Request PDF & Guidelines')} 
                desc={tPublic('howToApplyLoanStep1Desc', 'Download the official Loan Application PDF, credit policy manual, and collateral declaration forms from Downloads.')} 
                icon={<Download className="h-4 w-4 text-blue-900" />}
              />
              <Step 
                num="02" 
                title={tPublic('howToApplyLoanStep2Title', 'Complete Forms & Certificates')} 
                desc={tPublic('howToApplyLoanStep2Desc', 'Fill out the loan request form, obtain Marital Status / Marriage Certificate, and gather collateral proof documents.')} 
                icon={<FileText className="h-4 w-4 text-blue-900" />}
              />
              <Step 
                num="03" 
                title={tPublic('howToApplyLoanStep3Title', 'Verify Membership & Financial Details')} 
                desc={tPublic('howToApplyLoanStep3Desc', 'Enter active membership number, verify email via OTP, select loan product, amount, tenure, and collateral details.')} 
                icon={<Smartphone className="h-4 w-4 text-blue-900" />}
              />
              <Step 
                num="04" 
                title={tPublic('howToApplyLoanStep4Title', 'Upload Documents & Track Review')} 
                desc={tPublic('howToApplyLoanStep4Desc', 'Upload personal ID, Marital Status Certificate, filled forms, and collateral evidence to complete submission.')} 
                icon={<CheckCircle2 className="h-4 w-4 text-blue-900" />}
              />
            </div>

            <Button 
              size="lg" 
              onClick={() => navigate('/loan-apply')}
              className="w-full bg-blue-950 hover:bg-blue-800 h-20 text-sm font-black uppercase tracking-[0.2em] rounded-none shadow-2xl transition-all"
            >
              {tPublic('applyLoan', 'Apply for Loan Now')} <ArrowRight className="ml-4 h-5 w-5" />
            </Button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

function Step({ num, title, desc, icon }: { num: string, title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="relative group">
      <div className="absolute -left-12 top-0 bg-white w-8 h-8 border-2 border-slate-200 flex items-center justify-center font-black text-[10px] text-blue-950 group-hover:border-blue-600 transition-all">
        {num}
      </div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-xl font-black text-blue-950 uppercase italic tracking-tighter leading-none">
          {title}
        </h3>
      </div>
      <p className="text-slate-500 font-bold italic text-sm leading-relaxed max-w-md">
        {desc}
      </p>
    </div>
  );
}
