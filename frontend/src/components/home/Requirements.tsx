import { motion } from 'framer-motion';
import { FileCheck, CreditCard, ShieldCheck, UserCheck, Smartphone, MapPin, Wallet, Timer } from 'lucide-react';
import { usePublicUiI18n } from '@/lib/uiI18n';

const membershipReqs = [
  { icon: <UserCheck size={18} />, textKey: 'homeRequirementsMembershipItem1', textFallback: 'National Identity Card / Passport' },
  { icon: <Smartphone size={18} />, textKey: 'homeRequirementsMembershipItem2', textFallback: 'Valid Phone Number' },
  { icon: <MapPin size={18} />, textKey: 'homeRequirementsMembershipItem3', textFallback: 'Personal Information and Address' },
  { icon: <Wallet size={18} />, textKey: 'homeRequirementsMembershipItem4', textFallback: 'Initial Share Contribution' },
];

const loanReqs = [
  { icon: <ShieldCheck size={18} />, textKey: 'homeRequirementsLoanItem1', textFallback: 'Valid Member Identification' },
  { icon: <FileCheck size={18} />, textKey: 'homeRequirementsLoanItem2', textFallback: 'Proof of Income (Salary Slips)' },
  { icon: <CreditCard size={18} />, textKey: 'homeRequirementsLoanItem3', textFallback: 'Collateral Information' },
  { icon: <Timer size={18} />, textKey: 'homeRequirementsLoanItem4', textFallback: '6 Months Saving History' },
];

export function Requirements() {
  const { tPublic } = usePublicUiI18n();

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      
      {/* Aesthetic Tech Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#2563eb 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      <div className="container mx-auto px-6 lg:px-20 relative z-10">
        
        {/* Header - Clean & Sharp */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-blue-50 border border-blue-100 mb-4">
            <span className="text-blue-600 text-[10px] font-black uppercase tracking-[0.3em]">{tPublic('homeRequirementsKicker', 'Checklist')}</span>
          </div>
          <h2 className="text-4xl font-black text-blue-950 uppercase italic tracking-tighter">
            {tPublic('homeRequirementsTitle', 'Preparation Guide')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-200 shadow-2xl bg-white">
          
          {/* MEMBERSHIP BOX */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="p-10 lg:p-14 group hover:bg-blue-50/50 transition-colors duration-500 border-b md:border-b-0 md:border-r border-slate-200"
          >
            <div className="flex items-center gap-4 mb-10">
               <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <UserCheck size={24} />
               </div>
               <h3 className="text-2xl font-black text-blue-950 uppercase italic group-hover:text-blue-600 transition-colors">
                {tPublic('membership', 'Membership')}
               </h3>
            </div>
            
            <ul className="space-y-6">
              {membershipReqs.map((item, idx) => (
                <motion.li 
                  key={idx} 
                  className="flex items-center gap-4 group/item"
                >
                  <span className="text-blue-600 group-hover/item:translate-x-1 transition-transform">
                    {item.icon}
                  </span>
                  <span className="text-slate-600 font-bold italic text-sm group-hover/item:text-blue-950 transition-colors">
                    {tPublic(item.textKey, item.textFallback)}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* LOAN BOX */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="p-10 lg:p-14 group hover:bg-blue-950 transition-all duration-500"
          >
            <div className="flex items-center gap-4 mb-10">
               <div className="w-12 h-12 bg-blue-950 text-white flex items-center justify-center shadow-lg group-hover:bg-white group-hover:text-blue-600 transition-all">
                  <ShieldCheck size={24} />
               </div>
               <h3 className="text-2xl font-black text-blue-950 group-hover:text-white uppercase italic transition-colors">
                {tPublic('homeRequirementsLoanServices', 'Loan Services')}
               </h3>
            </div>
            
            <ul className="space-y-6">
              {loanReqs.map((item, idx) => (
                <motion.li 
                  key={idx} 
                  className="flex items-center gap-4 group/item"
                >
                  <span className="text-blue-600 group-hover:text-blue-400 transition-colors">
                    {item.icon}
                  </span>
                  <span className="text-slate-600 group-hover:text-white font-bold italic text-sm transition-colors">
                    {tPublic(item.textKey, item.textFallback)}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            {tPublic('homeRequirementsFooterNote', 'All documents must be valid at the time of submission.')}
          </p>
        </div>
      </div>
    </section>
  );
}
