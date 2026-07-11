import { motion } from 'framer-motion';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { ShieldCheck, TrendingUp, Lock } from 'lucide-react';
export function TrustIntro() {
  const { tPublic } = usePublicUiI18n();

  return (
    <section className="relative py-28 bg-white overflow-hidden">
      {/* Background Decorative Element - Subtle Blue Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-50/50 rounded-[100%] blur-3xl z-0" />
      
      <div className="container relative mx-auto px-6 lg:px-16 z-10">
        <div className="max-w-5xl mx-auto text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Small Gold/Blue Label */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className="w-10 h-[1px] bg-blue-600"></span>
              <span className="text-blue-600 font-black uppercase tracking-[0.4em] text-[10px]">
                {tPublic('homeTrustLegacyLabel', 'Our Legacy')}
              </span>
              <span className="w-10 h-[1px] bg-blue-600"></span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-black text-blue-950 mb-10 tracking-tighter">
              {tPublic('homeTrustTitle', 'Trusted by Generations')}
            </h2>

            {/* Glass-morphism Quote Card */}
            <div className="relative p-10 lg:p-16 bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-none">
              <span className="absolute top-0 left-10 -translate-y-1/2 text-8xl font-serif text-blue-600/10 select-none">
                “
              </span>
              
              <p className="text-xl lg:text-2xl text-slate-700 leading-relaxed font-bold italic relative z-10">
                {tPublic('homeTrustQuotePrefix', 'Zemen Saving and Credit Cooperative is a trusted financial partner dedicated to helping individuals and communities grow through')}
                <span className="text-blue-600"> {tPublic('homeTrustQuoteAccent', 'smart savings')}</span>,
                {' '}
                {tPublic('homeTrustQuoteSuffix', 'responsible lending, and accessible member services.')}
              </p>

              <span className="absolute bottom-0 right-10 translate-y-1/2 text-8xl font-serif text-blue-600/10 select-none">
                ”
              </span>
            </div>

            {/* High-Fidelity Trust Markers */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center group">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <ShieldCheck size={24} />
                </div>
                <span className="font-black text-xs tracking-[0.2em] text-blue-950 uppercase">
                  {tPublic('homeTrustMarkerFinancialStability', 'Financial Stability')}
                </span>
              </div>

              <div className="flex flex-col items-center group">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <TrendingUp size={24} />
                </div>
                <span className="font-black text-xs tracking-[0.2em] text-blue-950 uppercase">
                  {tPublic('homeTrustMarkerCommunityGrowth', 'Community Growth')}
                </span>
              </div>

              <div className="flex flex-col items-center group">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Lock size={24} />
                </div>
                <span className="font-black text-xs tracking-[0.2em] text-blue-950 uppercase">
                  {tPublic('homeTrustMarkerSecureFuture', 'Secure Future')}
                </span>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
           style={{ backgroundImage: `radial-gradient(#2563eb 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />
    </section>
  );
}
