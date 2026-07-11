import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, UserPlus, Coins, MessageSquare } from 'lucide-react';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Link } from 'react-router-dom';
// Using one of the approved hero images
import zemenBuilding from '@/assets/unnamed (6).jpg'; 

export function CTA() {
  const { tPublic } = usePublicUiI18n();

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="container mx-auto px-5 sm:px-6 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="group relative flex min-h-[460px] flex-col justify-end overflow-hidden border border-slate-100 shadow-2xl md:min-h-[560px]"
        >
          {/* BACKGROUND IMAGE - FULL 100% VISIBILITY */}
          <div className="absolute inset-0 z-0">
            <img 
              src={zemenBuilding} 
              alt={tPublic('homeCtaImageAlt', 'Zemen Building')} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[5000ms]"
            />
            {/* Very light tint to ensure the building stays bright but text remains readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-950/20 to-transparent" />
          </div>

          {/* HORIZONTAL GLASS BAR - TEXT & BUTTONS AT THE BOTTOM */}
          <div className="relative z-10 w-full border-t border-white/10 bg-blue-950/80 p-6 backdrop-blur-xl transition-all duration-500 group-hover:bg-blue-900/90 md:p-10 lg:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              
              {/* Text Section */}
              <div className="max-w-2xl text-center lg:text-left">
                <div className="inline-block bg-blue-600 px-3 py-1 mb-4 shadow-lg">
                  <span className="text-white text-[9px] font-black uppercase tracking-[0.3em]">{tPublic('homeCtaKicker', 'Official Zemen Portal')}</span>
                </div>
                <h2 className="mb-3 text-2xl font-black uppercase italic tracking-tight text-white md:text-3xl lg:text-4xl">
                  {tPublic('homeCtaTitlePrefix', 'Strengthen Your')} <span className="text-blue-400">{tPublic('homeCtaTitleAccent', 'Financial Future')}</span>
                </h2>
                <p className="border-l-2 border-blue-600 pl-4 text-sm font-semibold italic text-blue-100/85 lg:border-l-4">
                  {tPublic('homeCtaDescription', 'Join a growing community who trust Zemen for security and growth.')}
                </p>
              </div>

              {/* Action Buttons Section */}
              <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2 sm:gap-4 lg:flex lg:flex-wrap lg:justify-end">
                <Button 
                  size="lg"
                  className="h-12 w-full rounded-md border-2 border-blue-600 bg-blue-600 px-5 text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-white hover:text-blue-950 sm:w-auto md:h-14 md:px-8 group/btn"
                  asChild
                >
                  <Link to="/membership-apply" className="flex items-center gap-3">
                    <UserPlus size={18} /> {tPublic('homeCtaJoinNow', 'Join Now')}
                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>

                <Button 
                  size="lg"
                  variant="outline" 
                  className="h-12 w-full rounded-md border-white/60 bg-white/5 px-5 text-[11px] font-black uppercase tracking-widest text-white backdrop-blur-sm transition-all hover:bg-white hover:text-blue-950 sm:w-auto md:h-14 md:px-8"
                  asChild
                >
                  <Link to="/loan-apply" className="flex items-center gap-3">
                    <Coins size={18} /> {tPublic('applyLoan', 'Apply Loan')}
                  </Link>
                </Button>

                <Button 
                  size="lg"
                  variant="ghost"
                  className="h-12 w-full rounded-md border border-white/20 px-5 text-[11px] font-black uppercase tracking-widest text-white/80 transition-all hover:bg-white/10 hover:text-white sm:col-span-2 sm:w-auto md:h-14 md:px-8"
                  asChild
                >
                  <Link to="/status" className="flex items-center gap-3">
                    <MessageSquare size={18} /> {tPublic('trackApplication', 'Track Application')}
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bottom Accent Detail */}
            <div className="relative mt-6 h-[2px] w-full overflow-hidden bg-white/10 md:mt-8">
               <div className="absolute inset-0 w-1/4 bg-blue-600 transition-all duration-[3000ms] group-hover:w-full"></div>
            </div>
          </div>

        </motion.div>
      </div>
    </section>
  );
}
