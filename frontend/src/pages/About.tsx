import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Zap, HeartHandshake, Globe, Award, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Assets - Using the provided hero images
import buildingImg from '@/assets/unnamed (6).jpg'; 
import officeImg from '@/assets/photo_2026-04-08_17-03-50.jpg';
import { usePublicUiI18n } from '@/lib/uiI18n';

const About: React.FC = () => {
  const { tPublic } = usePublicUiI18n();
  const navigate = useNavigate();
  return (
    <div className="bg-white overflow-hidden">
      
      {/* 1. EDITORIAL HERO SECTION */}
      {/* 1. REFINED PROFESSIONAL HERO */}
      <section className="relative flex min-h-[68vh] items-center overflow-hidden bg-white pt-14 md:min-h-[78vh] md:pt-20">
        {/* Subtle Brand Background Line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-100 -z-0" />
        
        <div className="container relative z-10 mx-auto px-5 sm:px-6 lg:px-12">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            
            {/* LEFT: REFINED TYPOGRAPHY */}
            <div className="lg:col-span-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="mb-6 flex items-center gap-3 md:mb-8">
                  <span className="w-8 h-[3px] bg-blue-600" />
                  <span className="text-blue-600 text-[10px] font-black uppercase tracking-[0.5em]">
                    {tPublic('aboutOurLegacy', 'Our Legacy')}
                  </span>
                </div>
                
                {/* Decreased & Balanced Text Sizes */}
                <h1 className="mb-6 flex flex-col md:mb-8">
                  <span className="text-4xl font-black uppercase italic leading-tight tracking-tighter text-blue-950 sm:text-5xl lg:text-7xl">
                    {tPublic('aboutHeroLineOne', 'The')} <span className="text-blue-600">{tPublic('aboutHeroLineOneAccent', 'Standard')}</span>
                  </span>
                  <span 
                    className="mt-2 text-3xl font-extrabold uppercase italic leading-none tracking-[0.12em] opacity-90 sm:text-4xl lg:text-6xl"
                    style={{ 
                      WebkitTextStroke: '1.5px #1e3a8a', 
                      color: 'transparent'
                    }}
                  >
                    {tPublic('aboutHeroLineTwo', 'Of Trust')}
                  </span>
                </h1>
                
                <p className="mb-8 max-w-md text-base font-bold italic leading-relaxed text-slate-500 md:mb-10 md:text-lg">
                  {tPublic('aboutHeroDescription', 'Providing a secure foundation for financial growth and community empowerment since 2010.')}
                </p>

                <div className="flex flex-wrap items-center gap-5 md:gap-8">
                  <button
                    onClick={() => navigate('/services')}
                    className="h-11 bg-blue-950 px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-blue-600 md:h-12 md:px-8"
                  >
                    {tPublic('aboutOurPrinciples', 'Our Principles')}
                  </button>
                  <div className="h-8 w-[1px] bg-slate-200 md:h-10" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {tPublic('aboutVerifiedGovernance', 'Verified Governance')}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* RIGHT: CLEAN GEOMETRIC IMAGE */}
            <div className="lg:col-span-6 relative">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative"
              >
                {/* Refined Image Frame */}
                <div className="relative z-10 aspect-video lg:aspect-[5/4] overflow-hidden shadow-2xl">
                  <img 
                    src={officeImg} 
                    alt={tPublic('aboutInteriorAlt', 'Zemen Interior')} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-blue-950/10" />
                </div>
                
                {/* Minimalist Decorative Element */}
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-50 -z-10" />
                <div className="absolute -bottom-6 -left-6 w-full h-full border border-slate-100 -z-10" />
                
                {/* Subtle Info Overlay */}
                <div className="absolute right-0 -bottom-10 bg-white p-8 shadow-xl border-t-4 border-blue-600 hidden lg:block">
                  <div className="text-2xl font-black text-blue-950 italic">24+</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{tPublic('aboutRegionalBranches', 'Regional Branches')}</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORPORATE OVERVIEW SECTION */}
      <section className="relative z-10 bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
            <div className="lg:w-1/3">
              <span className="text-blue-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">{tPublic('aboutInstitution', 'The Institution')}</span>
              <h2 className="text-4xl lg:text-5xl font-black text-blue-950 uppercase italic leading-none mb-6 tracking-tighter">
                {tPublic('aboutStrategic', 'Strategic')} <br /> <span className="text-blue-600">{tPublic('aboutOverview', 'Overview')}</span>
              </h2>
              <div className="w-20 h-2 bg-blue-600" />
            </div>
            
            <div className="lg:w-2/3 grid gap-10 md:grid-cols-2 md:gap-12">
              <div className="space-y-6">
                <p className="text-base font-bold italic leading-relaxed text-slate-500 md:text-lg">
                  {tPublic('aboutOverviewLeft', 'Established in 2010, Zemen Saving and Credit Cooperative has become a cornerstone of financial security in Ethiopia, governed by a commitment to member prosperity and ethical banking.')}
                </p>
                <div className="group flex items-center gap-4 border-r-4 border-blue-600 bg-slate-50 p-5 transition-colors hover:bg-blue-600 md:gap-5 md:p-6">
                  <Globe className="text-blue-600 group-hover:text-white" />
                  <span className="text-xs font-black uppercase text-blue-950 group-hover:text-white italic tracking-widest">{tPublic('aboutBranchesNationwide', '24+ Branches Nationwide')}</span>
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-base font-bold italic leading-relaxed text-slate-500 md:text-lg">
                  {tPublic('aboutOverviewRight', 'Our democratic structure ensures that every member is an owner. We leverage modern technology to provide high-yield savings and affordable credit.')}
                </p>
                <div className="group flex items-center gap-4 border-r-4 border-blue-600 bg-slate-50 p-5 transition-colors hover:bg-blue-600 md:gap-5 md:p-6">
                  <Award className="text-blue-600 group-hover:text-white" />
                  <span className="text-xs font-black uppercase text-blue-950 group-hover:text-white italic tracking-widest">{tPublic('aboutProfessionalGovernance', 'Professional Governance')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MISSION & VISION DUALITY */}
      {/* 3. UNIFIED MISSION & VISION: GLASS-ON-IMAGE */}
      <section className="relative px-5 py-14 sm:px-6 md:py-20">
        <div className="max-w-7xl mx-auto overflow-hidden relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)]">
          
          {/* Unified Background Image */}
          <div className="absolute inset-0">
            <img 
              src={buildingImg} 
              className="w-full h-full object-cover scale-105" 
              alt={tPublic('aboutBuildingAlt', 'Zemen Building')} 
            />
            {/* Professional Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-950/70 to-blue-900/80" />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2">
            
            {/* MISSION CARD: Frosted Glass Effect */}
            <motion.div 
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: -20 }}
              className="border-b border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-10 lg:border-b-0 lg:border-r lg:p-14"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-[2px] bg-blue-500" />
                <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">{tPublic('aboutOurPurpose', 'Our Purpose')}</span>
              </div>
              <h3 className="mb-6 text-3xl font-black uppercase italic tracking-tighter text-white md:mb-8 md:text-4xl">
                {tPublic('aboutMissionTitle', 'Mission')}
              </h3>
              <p className="border-l-4 border-blue-500 pl-5 text-base font-bold italic leading-relaxed text-blue-50/90 md:pl-8 md:text-xl">
                {tPublic('aboutMissionText', '"To provide high-quality financial services that promote saving habits and enhance socio-economic welfare through modern, sustainable cooperative practices."')}
              </p>
            </motion.div>

            {/* VISION CARD: High-Contrast Glass */}
            <motion.div 
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: 20 }}
              className="bg-blue-600/10 p-6 backdrop-blur-sm md:p-10 lg:p-14"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-[2px] bg-white/30" />
                <span className="text-white/50 text-[10px] font-black uppercase tracking-[0.5em]">{tPublic('aboutFutureOutlook', 'Future Outlook')}</span>
              </div>
              <h3 className="mb-6 text-3xl font-black uppercase italic tracking-tighter text-white md:mb-8 md:text-4xl">
                {tPublic('aboutVisionTitle', 'Vision')}
              </h3>
              <div className="space-y-6">
                <p className="text-xl font-black italic leading-tight text-white md:text-2xl">
                  {tPublic('aboutVisionText', 'To be the most trusted, leading, and member-centric financial cooperative in Ethiopia.')}
                </p>
                <p className="text-sm text-blue-300 font-bold italic uppercase tracking-widest">
                  {tPublic('aboutVisionTagline', 'Driving Economic Transformation Since 2010')}
                </p>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Decorative Element below the box */}
        <div className="absolute bottom-0 right-1/4 w-64 h-2 bg-blue-600 hidden lg:block" />
      </section>

      {/* 4. STATS BAR: MINIMALIST & BOLD */}
      <section className="border-y border-slate-200 bg-slate-50 py-14 md:py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 gap-8 px-5 sm:px-6 lg:grid-cols-4 lg:gap-12">
          <StatBox label={tPublic('aboutStatActiveMembers', 'Active Members')} value="50K+" />
          <StatBox label={tPublic('aboutStatYearsService', 'Years of Service')} value="13+" />
          <StatBox label={tPublic('aboutStatSuccessRate', 'Success Rate')} value="99%" />
          <StatBox label={tPublic('aboutStatActiveBranches', 'Active Branches')} value="24" />
        </div>
      </section>

      {/* 5. VALUES: TECH-MODERN CARDS */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-5 text-center sm:px-6">
          <h2 className="mb-12 text-3xl font-black uppercase italic tracking-tighter text-blue-950 md:mb-16 md:text-4xl">{tPublic('aboutZemenStandardPrefix', 'The Zemen')} <span className="text-blue-600">{tPublic('aboutZemenStandardAccent', 'Standard')}</span></h2>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            <ValueCard icon={<ShieldCheck size={40}/>} title={tPublic('aboutValueIntegrityTitle', 'Integrity')} desc={tPublic('aboutValueIntegrityDesc', 'Highest ethical standards ensuring total transparency and trust.')} />
            <ValueCard icon={<HeartHandshake size={40}/>} title={tPublic('aboutValueMemberFirstTitle', 'Member-First')} desc={tPublic('aboutValueMemberFirstDesc', 'Decisions guided solely by the financial well-being of our community.')} />
            <ValueCard icon={<Zap size={40}/>} title={tPublic('aboutValueInnovationTitle', 'Innovation')} desc={tPublic('aboutValueInnovationDesc', 'Leveraging modern fintech to provide seamless banking experiences.')} />
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
     {/* 6. PREMIUM "JOIN NOW" FINAL CTA */}
      <section className="px-5 py-16 sm:px-6 md:py-24">
        <div className="max-w-6xl mx-auto relative group overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)]">
          
          {/* Background with subtle parallax-style image */}
          <div className="absolute inset-0 z-0">
            <img 
              src={officeImg} 
              className="w-full h-full object-cover transition-transform duration-[10000ms] group-hover:scale-110" 
              alt={tPublic('aboutOfficeAlt', 'Zemen Office')} 
            />
            {/* Deep Navy Gradient Overlay */}
            <div className="absolute inset-0 bg-blue-950/90 backdrop-blur-[2px]" />
          </div>

          {/* Content Layer */}
          <div className="relative z-10 border border-white/10 p-8 text-center md:p-12 lg:p-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="mb-5 block text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 md:mb-6 md:tracking-[0.6em]">
                {tPublic('aboutTakeFirstStep', 'Take the first step')}
              </span>
              
              <h2 className="mb-6 text-3xl font-black uppercase italic leading-none tracking-tighter text-white md:mb-8 md:text-5xl lg:text-6xl">
                {tPublic('aboutReadyToJoin', 'Ready to Join the')} <br /> 
                <span className="text-transparent" style={{ WebkitTextStroke: '1px white' }}>
                  {tPublic('aboutZemenCommunity', 'Zemen Community?')}
                </span>
              </h2>
              
              <p className="mx-auto mb-10 max-w-xl text-sm font-bold italic leading-relaxed text-blue-100/70 md:mb-12">
                {tPublic('aboutCtaDescription', 'Experience a financial institution that prioritizes your growth. Join over 50,000 members building a secure future together.')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Primary Button */}
                <button
                  onClick={() => navigate('/membership-apply')}
                  className="group/btn flex h-12 w-full items-center justify-center gap-3 bg-blue-600 px-6 text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-xl transition-all hover:bg-white hover:text-blue-950 sm:w-auto sm:px-10"
                >
                  {tPublic('aboutOpenYourAccountCta', 'Open Your Account')} <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
                
                {/* Secondary Button */}
                <button
                  onClick={() => navigate('/membership')}
                  className="h-12 w-full border border-white/20 px-6 text-[11px] font-black uppercase tracking-[0.25em] text-white transition-all hover:border-white sm:w-auto sm:px-10"
                >
                  {tPublic('aboutViewRequirementsCta', 'View Requirements')}
                </button>
              </div>

              {/* Trust Indicator below buttons */}
              <div className="mt-10 flex flex-wrap justify-center gap-6 border-t border-white/5 pt-10 opacity-30 md:mt-12 md:gap-10 md:pt-12">
                <div className="text-[9px] font-black text-white uppercase tracking-widest italic">{tPublic('aboutTrustProfessionalManagement', 'Professional Management')}</div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest italic">{tPublic('aboutTrustEthicalInvestment', 'Ethical Investment')}</div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest italic">{tPublic('aboutTrustMemberOwned', 'Member-Owned')}</div>
              </div>
            </motion.div>
          </div>
          
          {/* Decorative Corner Element */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 translate-x-12 -translate-y-12 rotate-45" />
        </div>
      </section>
    </div>
  );
};

// Sub-component: Stat Box
const StatBox = ({ label, value }: { label: string, value: string }) => (
  <div className="text-center group cursor-default">
    <div className="mb-3 text-4xl font-black italic tracking-tighter text-blue-950 transition-all duration-500 group-hover:text-blue-600 md:mb-4 md:text-5xl lg:text-6xl">
      {value}
    </div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{label}</div>
  </div>
);

// Sub-component: Value Card
const ValueCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <motion.div 
    whileHover={{ y: -15 }}
    className="group border border-slate-100 bg-white p-6 text-center shadow-xl transition-all duration-500 hover:border-blue-600 hover:shadow-2xl md:p-8 lg:p-10"
  >
    <div className="mb-6 flex justify-center text-blue-600 transition-transform group-hover:scale-110 md:mb-8">{icon}</div>
    <h3 className="mb-4 text-xl font-black uppercase italic tracking-tighter text-blue-950 md:mb-6 md:text-2xl">{title}</h3>
    <p className="text-slate-500 font-bold italic leading-relaxed text-sm">{desc}</p>
  </motion.div>
);

export default About;
