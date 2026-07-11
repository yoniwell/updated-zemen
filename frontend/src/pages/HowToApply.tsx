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
  CheckCircle2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // ✅ ADDED
import { usePublicUiI18n } from '@/lib/uiI18n';

export default function HowToApply() {
  const navigate = useNavigate(); // ✅ ADDED
  const { tPublic } = usePublicUiI18n();

  return (
    <div className="pt-16 pb-32 bg-white">
      <div className="container mx-auto px-6">
        
        {/* HEADER */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-6xl font-black text-blue-950 mb-6 uppercase italic tracking-tighter">
              {tPublic('howToApplyTitlePrefix', 'How to Apply')} <span className="text-blue-600">{tPublic('howToApplyTitleAccent', 'Online')}</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto font-bold italic leading-relaxed">
              {tPublic('howToApplyHeroDescription', 'Experience our streamlined digital process. Whether you are joining as a member or requesting a loan, we have made it simple and secure.')}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          
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
              <h2 className="text-3xl font-black text-blue-950 uppercase italic tracking-tighter">
                {tPublic('becomeMember', 'Become a Member')}
              </h2>
            </div>

            <div className="space-y-12 border-l-2 border-blue-50 pl-8 ml-6">
              <Step 
                num="01" 
                title={tPublic('howToApplyMembershipStep1Title', 'Fill Membership Form')} 
                desc={tPublic('howToApplyMembershipStep1Description', 'Start your 6-step membership journey with applicant type, contact details, and identity profile.')} 
                icon={<Smartphone className="h-4 w-4 text-blue-600" />}
              />
              <Step 
                num="02" 
                title={tPublic('howToApplyMembershipStep2Title', 'Upload Identity Documents')} 
                desc={tPublic('howToApplyMembershipStep2Description', 'Provide KYC files including ID front/back, applicant photo, and supporting address evidence when required.')} 
                icon={<ShieldCheck className="h-4 w-4 text-blue-600" />}
              />
              <Step 
                num="03" 
                title={tPublic('howToApplyMembershipStep3Title', 'Review and Submit')} 
                desc={tPublic('howToApplyMembershipStep3Description', 'Complete employment details, preferences, declarations, then review and submit to receive your reference number.')} 
                icon={<FileText className="h-4 w-4 text-blue-600" />}
              />
            </div>
            
            {/* ✅ FIXED BUTTON */}
            <Button 
              size="lg" 
              onClick={() => {
                navigate('/membership-apply');
              }}
              className="w-full bg-blue-600 hover:bg-blue-950 h-20 text-sm font-black uppercase tracking-[0.2em] rounded-none shadow-2xl transition-all"
            >
              {tPublic('becomeMember', 'Become a Member')} <ArrowRight className="ml-4 h-5 w-5" />
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
              <h2 className="text-3xl font-black text-blue-950 uppercase italic tracking-tighter">
                {tPublic('applyLoan', 'Apply Loan')}
              </h2>
            </div>

            <div className="space-y-12 border-l-2 border-slate-50 pl-8 ml-6">
              <Step 
                num="01" 
                title={tPublic('howToApplyLoanStep1Title', 'Select Loan Type')} 
                desc={tPublic('howToApplyLoanStep1Description', 'Begin the 7-step loan workflow with membership lookup, OTP verification, and product selection.')} 
                icon={<Smartphone className="h-4 w-4 text-blue-900" />}
              />
              <Step 
                num="02" 
                title={tPublic('howToApplyLoanStep2Title', 'Financial Information')} 
                desc={tPublic('howToApplyLoanStep2Description', 'Provide amount, tenure, purpose, repayment source, and detailed income/expense profile for assessment.')} 
                icon={<FileText className="h-4 w-4 text-blue-900" />}
              />
              <Step 
                num="03" 
                title={tPublic('howToApplyLoanStep3Title', 'Upload Requirements')} 
                desc={tPublic('howToApplyLoanStep3Description', 'Submit product-specific documents, guarantor/collateral details if needed, then review and finalize submission.')} 
                icon={<CheckCircle2 className="h-4 w-4 text-blue-900" />}
              />
            </div>

            {/* ✅ FIXED BUTTON */}
            <Button 
              size="lg" 
              onClick={() => {
                navigate('/loan-apply');
              }}
              className="w-full bg-blue-950 hover:bg-blue-800 h-20 text-sm font-black uppercase tracking-[0.2em] rounded-none shadow-2xl transition-all"
            >
              {tPublic('applyLoan', 'Apply Loan')} <ArrowRight className="ml-4 h-5 w-5" />
            </Button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// Step Component (UNCHANGED)
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
