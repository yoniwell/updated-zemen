import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  UserPlus, 
  FileCheck, 
  Landmark, 
  ShieldCheck, 
  AlertTriangle,
  Users,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Page } from '../App';
import { useNavigate } from 'react-router-dom';
import { usePublicUiI18n } from '@/lib/uiI18n';

// Asset: provided hero image
import heroImg from '@/assets/unnamed (6).jpg';

interface MembershipProps {
  onNavigate: (page: Page) => void;
}

export default function Membership({ onNavigate }: MembershipProps) {
  const navigate = useNavigate();
  const { tPublicUi } = usePublicUiI18n();

  const steps: Array<{ icon: LucideIcon; title: string; desc: string }> = [
    { icon: UserPlus, title: tPublicUi('fillForm', 'Fill Form'), desc: tPublicUi('fillFormDesc', 'Complete the digital membership form accurately.') },
    { icon: FileCheck, title: tPublicUi('kycUpload', 'KYC Upload'), desc: tPublicUi('kycUploadDesc', 'Submit valid identity and supporting documents.') },
    { icon: Landmark, title: tPublicUi('contribution', 'Contribution'), desc: tPublicUi('contributionDesc', 'Satisfy initial share and registration requirements.') },
    { icon: ShieldCheck, title: tPublicUi('finalApproval', 'Final Approval'), desc: tPublicUi('finalApprovalDesc', 'Verification by our membership committee.') },
  ];

  const eligibleGroups = [
    {
      icon: <Briefcase />,
      title: tPublicUi('salariedEmployees', 'Salaried Employees'),
      desc: tPublicUi('salariedEmployeesDesc', 'Public, private, and NGO sector workers.'),
    },
    {
      icon: <Users />,
      title: tPublicUi('smallBusinessOwners', 'Small Business Owners'),
      desc: tPublicUi('smallBusinessOwnersDesc', 'Entrepreneurs, traders, and service providers.'),
    },
    {
      icon: <GraduationCap />,
      title: tPublicUi('youthAndWomen', 'Youth & Women'),
      desc: tPublicUi('youthAndWomenDesc', 'Focused on formal savings and credit access.'),
    },
  ];

  const requirements = [
    tPublicUi('legalAgeRequirement', 'Legal age to enter financial agreements.'),
    tPublicUi('completeFormRequirement', 'Accurate completion of digital membership forms.'),
    tPublicUi('kycRequirement', 'Submission of valid identity and KYC documents.'),
    tPublicUi('termsRequirement', 'Acceptance of SACCO terms and declarations.'),
    tPublicUi('contributionRequirement', 'Initial share contribution & account requirements.'),
  ];

  return (
    <div className="bg-white">
      
      {/* 1. ATTACHED HERO SECTION - BLUR REMOVED */}
      <section className="relative flex min-h-[56vh] items-center overflow-hidden bg-white pt-14 md:min-h-[62vh] md:pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg} 
            className="w-full h-full object-cover brightness-110 contrast-125 opacity-70" 
            alt="Zemen Membership" 
          />
          {/* Subtle gradient to keep text readable on top of the image */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
        </div>
        
        <div className="container relative z-10 mx-auto px-5 sm:px-6">
          {/* Background and Blur classes REMOVED here */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl px-0 py-6 sm:p-6 md:p-8"
          >
            <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.35em] text-blue-700 drop-shadow-sm sm:mb-6 sm:text-[12px] sm:tracking-[0.8em]">
              {tPublicUi('joinOurCooperative', 'Join Our Cooperative')}
            </span>
            <h1 className="mb-5 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-blue-950 drop-shadow-sm sm:mb-8 sm:text-5xl lg:text-7xl">
              {tPublicUi('becomeMember', 'Become a Member')}
            </h1>
            <p className="mb-7 max-w-xl text-base font-bold italic leading-relaxed text-slate-800 drop-shadow-sm sm:mb-10 sm:text-xl">
              {tPublicUi('membershipHeroDescription', 'Membership is a gateway to secure savings, responsible credit, and a relationship-driven financial institution you truly own.')}
            </p>
            <Button 
              size="lg" 
              className="h-12 rounded-md bg-blue-700 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-blue-950 sm:h-14 sm:rounded-none sm:px-10 sm:text-sm"
              onClick={() => {
                onNavigate('membership');
                navigate('/membership-apply');
              }}
            >
              {tPublicUi('startMembershipApplication', 'Start Membership Application')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 2. THE PROCESS (Step Indicator) */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="container mx-auto px-5 sm:px-6">
          <div className="mb-10 text-center md:mb-14">
            <h2 className="mb-4 text-2xl font-black uppercase italic tracking-tighter text-blue-950 md:text-3xl">{tPublicUi('joiningProcess', 'Joining Process')}</h2>
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
            <h2 className="mb-6 text-3xl font-black uppercase italic tracking-tighter text-blue-950 md:mb-8 md:text-4xl">{tPublicUi('whoCanJoin', 'Who Can Join?')}</h2>
            <p className="mb-6 text-sm font-bold italic leading-relaxed text-slate-600 md:mb-8 md:text-base">
              {tPublicUi('whoCanJoinDesc', 'We welcome individuals committed to maintaining an active relationship through savings and participation.')}
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
            <h3 className="mb-6 text-xl font-black uppercase italic tracking-tighter md:mb-8 md:text-2xl">{tPublicUi('applicationRequirements', 'Application Requirements')}</h3>
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
                {tPublicUi('approvalRequiresSignoff', 'Approval requires KYC verification and final sign-off by a branch manager or designated committee.')}
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
            <h2 className="text-xl font-black text-blue-950 uppercase italic tracking-tighter md:text-2xl">{tPublicUi('groundsForRejection', 'Grounds for Rejection')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RejectionItem title={tPublicUi('incompleteData', 'Incomplete Data')} desc={tPublicUi('incompleteDataDesc', 'Missing mandatory attachments or empty form fields.')} />
            <RejectionItem title={tPublicUi('invalidIdentity', 'Invalid Identity')} desc={tPublicUi('invalidIdentityDesc', 'Expired, illegible, or contradictory identity documents.')} />
            <RejectionItem title={tPublicUi('policyNonCompliance', 'Policy Non-compliance')} desc={tPublicUi('policyNonComplianceDesc', 'False information or duplicate identity submissions.')} />
          </div>
        </div>
      </section>

      {/* 5. FOOTER CALLOUT */}
      <section className="container mx-auto px-5 pb-16 text-center sm:px-6 md:pb-24">
        <div className="group relative overflow-hidden bg-blue-700 p-8 md:p-10 lg:p-16">
          <div className="absolute inset-0 bg-blue-950 opacity-0 group-hover:opacity-20 transition-opacity" />
          <h2 className="relative z-10 mb-6 text-2xl font-black uppercase italic tracking-tighter text-white md:mb-8 md:text-4xl lg:text-5xl">
            {tPublicUi('readyToBecomeShareholder', 'Ready to become a shareholder?')}
          </h2>
          <Button 
            size="lg" 
            className="relative z-10 h-12 rounded-md bg-white px-6 text-[11px] font-black uppercase tracking-widest text-blue-700 shadow-2xl transition-all hover:bg-blue-950 hover:text-white sm:h-14 sm:rounded-none sm:px-10 sm:text-sm"
            onClick={() => {
              onNavigate('membership');
              navigate('/membership-apply');
            }}
          >
            {tPublicUi('openYourAccount', 'Open Your Account')} <ArrowRight className="ml-2" />
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
