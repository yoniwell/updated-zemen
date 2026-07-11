import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Landmark, Users, Monitor, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchPublicServices, type PublicService } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Link } from 'react-router-dom';
const fallbackServices = [
  {
    icon: <Wallet className="h-8 w-8" />,
    titleKey: 'homeServicesFallbackSavingsTitle',
    titleFallback: 'Savings Products',
    descriptionKey: 'homeServicesFallbackSavingsDescription',
    descriptionFallback: 'Grow your wealth with competitive interest rates and secure savings accounts designed for your future.',
    link: '/savings',
    count: '01'
  },
  {
    icon: <Landmark className="h-8 w-8" />,
    titleKey: 'homeServicesFallbackLoanTitle',
    titleFallback: 'Loan Products',
    descriptionKey: 'homeServicesFallbackLoanDescription',
    descriptionFallback: 'Access flexible loan options with fair rates to support your personal, business, or emergency needs.',
    link: '/loans',
    count: '02'
  },
  {
    icon: <Users className="h-8 w-8" />,
    titleKey: 'homeServicesFallbackMembershipTitle',
    titleFallback: 'Membership Benefits',
    descriptionKey: 'homeServicesFallbackMembershipDescription',
    descriptionFallback: 'Enjoy exclusive benefits, including dividend shares and community support as a valued member.',
    link: '/membership',
    count: '03'
  },
  {
    icon: <Monitor className="h-8 w-8" />,
    titleKey: 'homeServicesFallbackDigitalTitle',
    titleFallback: 'Digital Services',
    descriptionKey: 'homeServicesFallbackDigitalDescription',
    descriptionFallback: 'Manage your accounts, apply for loans, and more through our modern digital banking platform.',
    link: '/how-to-apply',
    count: '04'
  },
];

export function Services() {
  const { tPublic } = usePublicUiI18n();
  const [cmsServices, setCmsServices] = useState<PublicService[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadServices = async () => {
      try {
        const data = await fetchPublicServices();
        if (mounted) setLoadFailed(false);
        if (mounted) setCmsServices(data);
      } catch {
        if (mounted) {
          setLoadFailed(true);
          setCmsServices([]);
        }
      }
    };

    void loadServices();

    return () => {
      mounted = false;
    };
  }, []);

  const services = useMemo(() => {
    if (loadFailed) {
      return fallbackServices.map((service) => ({
        icon: service.icon,
        title: tPublic(service.titleKey, service.titleFallback),
        description: tPublic(service.descriptionKey, service.descriptionFallback),
        link: service.link,
        count: service.count,
      }));
    }

    return cmsServices
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((service, index) => ({
        icon: index % 4 === 0 ? <Wallet className="h-8 w-8" /> : index % 4 === 1 ? <Landmark className="h-8 w-8" /> : index % 4 === 2 ? <Users className="h-8 w-8" /> : <Monitor className="h-8 w-8" />,
        title: service.title,
        description: service.description,
        link: service.ctaPath || '/services',
        count: String(index + 1).padStart(2, '0'),
      }));
  }, [cmsServices, loadFailed, tPublic]);

  return (
    <section className="py-24 bg-[#fcfdfe] relative">
      <div className="container mx-auto px-6 lg:px-16 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="inline-block px-4 py-1.5 mb-4 bg-blue-50 border border-blue-100"
          >
            <span className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px]">
              {tPublic('homeServicesKicker', 'Professional Excellence')}
            </span>
          </motion.div>
          <h2 className="text-4xl lg:text-5xl font-black text-blue-950 mb-6 tracking-tighter">
            {tPublic('homeServicesTitle', 'Our Services')}
          </h2>
          <div className="w-20 h-1.5 bg-blue-600 mx-auto mb-6"></div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="relative h-full border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.15)] transition-all duration-500 group overflow-hidden bg-white rounded-none flex flex-col">
                
                {/* Large Background Number */}
                <span className="absolute top-2 right-4 text-7xl font-black text-slate-50 group-hover:text-blue-50 transition-colors duration-500 pointer-events-none">
                  {service.count}
                </span>

                <CardHeader className="pt-12 px-8">
                  <div className="mb-6 w-14 h-14 bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:bg-blue-700 transition-colors duration-500">
                    {service.icon}
                  </div>
                  <CardTitle className="text-xl font-black text-blue-950 tracking-tight">
                    {service.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="px-8 pb-10 flex-grow flex flex-col justify-between space-y-8">
                  <CardDescription className="text-slate-500 leading-relaxed text-sm font-bold italic border-l-2 border-blue-100 pl-4">
                    "{service.description}"
                  </CardDescription>
                  
                  {/* ATTRACTIVE BLUE-TO-WHITE CHANGE BUTTON */}
                  <Button 
                    className="bg-blue-600 hover:bg-white text-white hover:text-blue-600 border-2 border-transparent hover:border-blue-600 text-[11px] font-black uppercase tracking-widest px-6 py-6 rounded-none shadow-xl transition-all duration-300 active:scale-95 group/btn w-fit" 
                    asChild
                  >
                    <Link to={service.link} className="flex items-center gap-2">
                      {tPublic('homeServicesDetails', 'Details')}
                      <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>

                {/* Top decorative line animation */}
                <div className="absolute top-0 left-0 w-full h-[4px] bg-slate-50 overflow-hidden">
                  <div className="w-0 h-full bg-blue-600 group-hover:w-full transition-all duration-700" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
