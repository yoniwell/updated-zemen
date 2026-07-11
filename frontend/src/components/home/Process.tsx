import { motion } from 'framer-motion';
import { Search, PenTool, Upload, CheckCircle } from 'lucide-react';
import { usePublicUiI18n } from '@/lib/uiI18n';

// Using one of the approved hero images for the side section
import officeImage from '@/assets/photo_2026-04-08_17-03-50.jpg'; 

const steps = [
  {
    icon: <Search className="h-6 w-6" />,
    titleKey: 'homeProcessStep1Title',
    titleFallback: 'Discover Services',
    descriptionKey: 'homeProcessStep1Description',
    descriptionFallback: 'Explore our savings and loan options online to find what fits your needs.',
  },
  {
    icon: <PenTool className="h-6 w-6" />,
    titleKey: 'homeProcessStep2Title',
    titleFallback: 'Submit Application',
    descriptionKey: 'homeProcessStep2Description',
    descriptionFallback: 'Apply for membership or a loan online through our secure application forms.',
  },
  {
    icon: <Upload className="h-6 w-6" />,
    titleKey: 'homeProcessStep3Title',
    titleFallback: 'Upload Documents',
    descriptionKey: 'homeProcessStep3Description',
    descriptionFallback: 'Upload your required identification and financial documents securely.',
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    titleKey: 'homeProcessStep4Title',
    titleFallback: 'Review and Approval',
    descriptionKey: 'homeProcessStep4Description',
    descriptionFallback: 'Our team reviews your application and provides feedback within 48 hours.',
  },
];

export function Process() {
  const { tPublic } = usePublicUiI18n();

  return (
    <section className="relative py-28 bg-white overflow-hidden">
      
      {/* Subtle Blue Background Accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-50/40 -skew-x-12 translate-x-24 z-0" />

      <div className="container mx-auto px-6 lg:px-16 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          
          {/* LEFT CONTENT: Vertical Steps */}
          <div className="w-full lg:w-1/2">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="mb-14"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-[2.5px] bg-blue-600"></span>
                <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px]">
                  {tPublic('homeProcessKicker', 'Seamless Journey')}
                </span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-blue-950 mb-6 tracking-tighter">
                {tPublic('homeProcessTitle', 'How It Works')}
              </h2>
              <p className="text-slate-500 font-bold italic border-l-4 border-blue-600 pl-6 py-2 leading-relaxed max-w-lg">
                {tPublic('homeProcessDescription', 'Your path to financial growth is just four simple steps away. Experience digital excellence with Zemen.')}
              </p>
            </motion.div>

            <div className="space-y-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.titleKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex gap-6 p-6 bg-white hover:bg-white transition-all border border-slate-100 hover:border-blue-600 shadow-sm hover:shadow-2xl"
                >
                  {/* Step Icon with Number */}
                  <div className="flex-shrink-0 w-14 h-14 bg-blue-600 text-white flex flex-col items-center justify-center shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-[9px] font-black opacity-60 mb-[-2px]">{tPublic('homeProcessStepLabel', 'STEP')} 0{index + 1}</span>
                    {step.icon}
                  </div>
                  
                  <div className="flex flex-col justify-center">
                    <h3 className="text-lg font-black text-blue-950 mb-1 group-hover:text-blue-600 transition-colors">
                      {tPublic(step.titleKey, step.titleFallback)}
                    </h3>
                    <p className="text-sm text-slate-500 font-bold leading-relaxed">
                      {tPublic(step.descriptionKey, step.descriptionFallback)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* RIGHT VISUAL: Image with Attractive Framing */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2 relative"
          >
            {/* Attractive Outer Frame Overlay */}
            <div className="absolute inset-0 border-[16px] border-blue-50/80 translate-x-10 translate-y-10 z-0" />
            
            <div className="relative z-10 w-full h-[600px] overflow-hidden shadow-2xl border-white border-[12px]">
              <img 
                src={officeImage} 
                alt={tPublic('homeProcessImageAlt', 'Zemen Member Services')} 
                className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" 
              />
              {/* Soft Gradient Overlay for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/20 to-transparent" />
            </div>

            {/* Premium Status Badge */}
            <div className="absolute -bottom-6 -left-6 bg-blue-600 text-white py-10 px-8 shadow-2xl z-20">
              <div className="text-center">
                <p className="text-4xl font-black mb-1">24/7</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                  {tPublic('homeProcessDigitalSupport', 'Digital Support')}
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
