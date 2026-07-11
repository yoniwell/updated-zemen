import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { usePublicUiI18n } from '@/lib/uiI18n';

// Using the approved hero images
import officeWelcome from '@/assets/photo_2026-04-08_17-03-50.jpg'; 
import officeInterior from '@/assets/unnamed (6).jpg'; 
import { Link } from 'react-router-dom';
export function Portals() {
  const { tPublic } = usePublicUiI18n();

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-16">
        <div className="mb-8 max-w-3xl md:mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
            {tPublic('homePortalsKicker', 'Start Your Application')}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-blue-950 md:text-5xl">
            {tPublic('homePortalsHeading', 'Choose Your Fastest Path')}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-600 md:text-base">
            {tPublic('homePortalsSubheading', 'Select membership or loan application and submit your request online without visiting a branch.')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
          
          {/* MEMBERSHIP PORTAL BOX */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative flex min-h-[360px] flex-col justify-end overflow-hidden border border-slate-100 p-6 shadow-2xl md:min-h-[460px] md:p-10 lg:p-12"
          >
            {/* FULL BACKGROUND IMAGE - 100% CLEAR */}
            <div className="absolute inset-0 z-0">
              <img 
                src={officeWelcome} 
                alt={tPublic('homePortalsMembershipImageAlt', 'Membership Office')} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              {/* Subtle Gradient to make text readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-transparent to-transparent group-hover:from-blue-600/80 transition-colors duration-500" />
            </div>

            <div className="relative z-10">
              {/* TEXT COLOR FLASH: White to Blue on Hover */}
              <h3 className="mb-3 text-3xl font-black uppercase italic tracking-tight text-white transition-colors duration-300 group-hover:text-white md:mb-4 md:text-4xl">
                {tPublic('homePortalsMembershipTitle', 'Membership Portal')}
              </h3>
              <p className="mb-6 border-l-4 border-white pl-4 text-sm font-semibold text-white/90 transition-colors group-hover:border-blue-300 md:mb-8 md:pl-6 md:text-base">
                {tPublic('homePortalsMembershipDescription', 'Apply to become a member online and submit your identity documents securely.')}
              </p>
              
              <Button 
                className="h-12 rounded-md bg-white px-6 text-[11px] font-black uppercase tracking-widest text-blue-950 shadow-2xl transition-all hover:bg-blue-600 hover:text-white md:h-14 md:px-8" 
                asChild
              >
                <Link to="/membership-apply" className="flex items-center gap-3">
                  {tPublic('homePortalsMembershipCta', 'Join Now')} <ArrowRight size={20} />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* LOAN PORTAL BOX */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group relative flex min-h-[360px] flex-col justify-end overflow-hidden border border-slate-100 p-6 shadow-2xl md:min-h-[460px] md:p-10 lg:p-12"
          >
            {/* FULL BACKGROUND IMAGE - 100% CLEAR */}
            <div className="absolute inset-0 z-0">
              <img 
                src={officeInterior} 
                alt={tPublic('homePortalsLoanImageAlt', 'Loan Office')} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              {/* Gradient changes to Blue on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-transparent to-transparent group-hover:from-blue-900/80 transition-colors duration-500" />
            </div>

            <div className="relative z-10">
              {/* TEXT COLOR FLASH */}
              <h3 className="mb-3 text-3xl font-black uppercase italic tracking-tight text-white transition-colors duration-500 group-hover:text-blue-300 md:mb-4 md:text-4xl">
                {tPublic('homePortalsLoanTitle', 'Loan Services')}
              </h3>
              <p className="mb-6 border-l-4 border-white pl-4 text-sm font-semibold text-white/90 transition-colors group-hover:border-blue-400 md:mb-8 md:pl-6 md:text-base">
                {tPublic('homePortalsLoanDescription', 'Members can request loans online with quick review and flexible repayment terms.')}
              </p>
              
              <Button 
                className="h-12 rounded-md bg-blue-600 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-white hover:text-blue-600 md:h-14 md:px-8" 
                asChild
              >
                <Link to="/loan-apply" className="flex items-center gap-3">
                  {tPublic('homePortalsLoanCta', 'Apply for Loan')} <ArrowRight size={20} />
                </Link>
              </Button>
            </div>
          </motion.div>

        </div>

        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 md:mt-6 md:flex-row md:items-center md:px-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-900 md:text-sm">
            {tPublic('homePortalsTrackPrompt', 'Already submitted? Check your application status in seconds.')}
          </p>
          <Button asChild variant="outline" className="h-11 border-blue-300 bg-white px-5 text-[11px] font-black uppercase tracking-wider text-blue-900 hover:bg-blue-600 hover:text-white">
            <Link to="/status" className="flex items-center gap-2">
              {tPublic('trackApplication', 'Track Application')}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
