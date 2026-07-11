import React, { useEffect, useState ,useCallback} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { fetchPublicBranches, submitPublicInquiry, type PublicBranch } from '@/lib/publicContentApi';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Mail, Globe, Phone, Send, Navigation2, ChevronRight } from 'lucide-react';
export default function Contact() {
  const { tPublic } = usePublicUiI18n();
  const defaultOfficeHours = tPublic('contactOfficeHoursWeekdays', 'Mon-Fri 8:30 AM - 5:30 PM');
  const buildFallbackMapUrl = (query: string) => `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  const toEmbedMapUrl = useCallback((rawUrl: string | undefined, fallbackQuery: string): string => {
    const trimmed = rawUrl?.trim();
    if (!trimmed) return buildFallbackMapUrl(fallbackQuery);

    if (trimmed.includes('output=embed') || trimmed.includes('/maps/embed')) {
      return trimmed;
    }

    if (/google\.[^/]+\/maps/i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        const query = parsed.searchParams.get('q') || parsed.searchParams.get('query') || fallbackQuery;
        return buildFallbackMapUrl(query);
      } catch {
        return buildFallbackMapUrl(fallbackQuery);
      }
    }

    return trimmed;
  }, [buildFallbackMapUrl]);
  // 1st Focus: Addis Abeba
  const [activeBranch, setActiveBranch] = useState("Addis Abeba");

  const branches = [
    { 
      name: "Addis Abeba", 
      location: "Bole Medhanialem", 
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.6128!2d38.7831!3d8.9953!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b850f9689f5c1%3A0x6a1c8b3f8e5c2d3a!2sBole%20Medhanialem%20Church!5e0!3m2!1sen!2set!4v1710000000000" 
    },
    { 
      name: "Mekelle Head Office", 
      location: "Adi Hawesi, In front of IOM", 
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3902.1!2d39.47!3d13.49!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sMekelle!5e0!3m2!1sen!2set!4v1710000000000" 
    },
    { 
      name: "Mekelle Branch", 
      location: "Kedamay Weyane, Marturs St.", 
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3902.1!2d39.46!3d13.48!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sKedamay%20Weyane!5e0!3m2!1sen!2set!4v1710000000000" 
    },
    {
      name: "Adigrat",
      location: "Main Road, Near Market Center",
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps?q=Adigrat,Ethiopia&output=embed"
    },
    {
      name: "AbiAdi",
      location: "Town Center, Service Corridor",
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps?q=Abi%20Adi,Ethiopia&output=embed"
    },
    {
      name: "Maychow",
      location: "Commercial District, Main Street",
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps?q=Maychew,Ethiopia&output=embed"
    },
    {
      name: "Adwa",
      location: "Central Avenue, Near Municipality",
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps?q=Adwa,Ethiopia&output=embed"
    },
    {
      name: "Shire",
      location: "Downtown Service Zone",
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps?q=Shire,Ethiopia&output=embed"
    },
    {
      name: "Rama",
      location: "Main Border Corridor",
      officeHours: defaultOfficeHours,
      mapUrl: "https://www.google.com/maps?q=Rama,Ethiopia&output=embed"
    }
  ];

  const defaultSupportLines = [
    { name: 'Mekelle Head Office', number: '0953444411' },
    { name: 'Adigrat', number: '0997346200' },
    { name: 'Adwa', number: '0997339200' },
    { name: 'Shire', number: '0997343200' },
    { name: 'Mekelle', number: '0997344200' },
    { name: 'AbiAdi', number: '0903212300' },
    { name: 'Rama', number: '0903351300' },
    { name: 'Maychew', number: '0903047300' },
  ];
  const [supportLines, setSupportLines] = useState(defaultSupportLines);
  const [cmsBranches, setCmsBranches] = useState(branches);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadBranches = async () => {
      try {
        const result = await fetchPublicBranches();
        if (!mounted || result.branches.length === 0) return;

        const mappedBranches = result.branches
          .map((branch: PublicBranch) => {
            const name = branch.name?.trim();
            if (!name) return null;

            const location = branch.location?.trim() || `${name}, Ethiopia`;
            return {
              name,
              location,
              officeHours: branch.officeHours?.trim() || defaultOfficeHours,
              mapUrl: toEmbedMapUrl(branch.mapUrl, location),
            };
          })
          .filter((branch): branch is NonNullable<typeof branch> => Boolean(branch));

        if (mappedBranches.length === 0) {
          return;
        }

        setCmsBranches(mappedBranches);
        setActiveBranch((current) =>
          mappedBranches.some((branch) => branch.name === current) ? current : mappedBranches[0].name
        );
        const namedContacts = Array.isArray(result.phoneContacts)
          ? result.phoneContacts.filter((contact) => Boolean(contact?.number?.trim()))
          : [];
        const legacyNumbers = Array.isArray(result.phoneNumbers) ? result.phoneNumbers : [];

        if (namedContacts.length > 0) {
          setSupportLines(
            namedContacts.map((contact, index) => ({
              name: contact.name?.trim() || defaultSupportLines[index]?.name || `Branch ${index + 1}`,
              number: contact.number.trim(),
            }))
          );
        } else if (legacyNumbers.length > 0) {
          setSupportLines(
            legacyNumbers.map((number, index) => ({
              name: defaultSupportLines[index]?.name ?? `Branch ${index + 1}`,
              number,
            }))
          );
        } else {
          setSupportLines(defaultSupportLines);
        }
      } catch {
        // Keep static fallback branch and phone values if CMS endpoint is unavailable.
      }
    };

    void loadBranches();

    return () => {
      mounted = false;
    };
  }, [defaultOfficeHours, toEmbedMapUrl, defaultSupportLines]);

  const submitInquiry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitFeedback(null);
    setSubmitError(null);

    const trimmedName = fullName.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setSubmitError(tPublic('contactErrorEnterFullName', 'Please enter your full name.'));
      return;
    }

    if (trimmedMessage.length < 10) {
      setSubmitError(tPublic('contactErrorDetailedMessage', 'Please provide a detailed message (at least 10 characters).'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPublicInquiry({
        fullName: trimmedName,
        message: trimmedMessage,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
      });

      setFullName('');
      setEmail('');
      setPhone('');
      setWebsite('');
      setMessage('');
      setSubmitFeedback(tPublic('contactSubmitSuccess', 'Your inquiry was submitted successfully. Our team will contact you soon.'));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : tPublic('contactSubmitFailure', 'Unable to submit inquiry at this time.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBranchData = cmsBranches.find((branch) => branch.name === activeBranch) ?? cmsBranches[0];

  return (
    <div className="min-h-screen bg-white pb-16 pt-16 md:pb-24 md:pt-20">
      <div className="container mx-auto px-5 sm:px-6">
        
        {/* --- HEADER --- */}
        <div className="max-w-4xl mb-12 md:mb-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="mb-6 text-4xl font-black uppercase italic leading-[0.9] tracking-tighter text-blue-950 sm:text-6xl md:mb-8 md:text-7xl">
              {tPublic('connectWithNetwork', 'Connect with The Network.')}
            </h1>
          </motion.div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 md:mb-20">
          
          {/* LEFT: INFO & DIRECTORY */}
          <div className="space-y-8 lg:col-span-7 md:space-y-10">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
              <ContactCard icon={<Mail className="text-blue-600" />} label={tPublic('officialEmail', 'Official Email')} value="info@zemensacco.com" />
              <ContactCard icon={<Globe className="text-blue-600" />} label={tPublic('webInfrastructure', 'Web Infrastructure')} value="zemensacco.com" />
            </div>

            <div className="border border-slate-100 bg-white p-5 md:p-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4">{tPublic('branchNetwork', 'Branch Network')}</h3>
              <p className="text-sm font-bold italic text-slate-500">{tPublic('servingMembers', 'Serving members through {{count}} operational offices across Ethiopia.', { count: cmsBranches.length })}</p>
            </div>

            <div className="relative grid grid-cols-1 gap-4 overflow-hidden bg-blue-950 p-6 text-white shadow-2xl md:grid-cols-2 md:gap-6 md:p-8">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl" />
               <div className="md:col-span-2 border-b border-blue-900 pb-4 mb-2">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">{tPublic('directSupportLines', 'Direct Support Lines')}</h3>
               </div>
               {supportLines.map((line) => (
                 <a href={`tel:${line.number}`} key={line.number} className="flex items-center gap-4 group cursor-pointer transition-all hover:translate-x-2">
                   <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                     <Phone size={14} className="text-blue-400 group-hover:text-white" />
                   </div>
                   <span className="text-base font-black italic tracking-tighter md:text-lg">{line.name}: {line.number}</span>
                 </a>
               ))}
            </div>
          </div>

          {/* RIGHT: CONTACT FORM */}
          <div className="lg:col-span-5">
            <div className="border border-slate-100 bg-white p-6 shadow-[20px_20px_0px_#f8fafc] md:p-8 md:shadow-[40px_40px_0px_#f8fafc]">
              <h2 className="mb-6 text-2xl font-black uppercase italic tracking-tighter text-blue-950 md:mb-8 md:text-3xl">{tPublic('digitalInquiry', 'Digital Inquiry')}</h2>
              <form className="space-y-5" onSubmit={submitInquiry}>
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tPublic('fullName', 'Full Name')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-12 w-full bg-slate-50 px-4 font-bold italic outline-none transition-all focus:ring-2 focus:ring-blue-600 md:h-14 md:px-6"
                    placeholder={tPublic('contactPlaceholderFullName', 'YOUR NAME')}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tPublic('emailOptional', 'Email (optional)')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full bg-slate-50 px-4 font-bold italic outline-none transition-all focus:ring-2 focus:ring-blue-600 md:h-14 md:px-6"
                      placeholder={tPublic('contactPlaceholderEmail', 'name@example.com')}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tPublic('phoneOptional', 'Phone (optional)')}</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="h-12 w-full bg-slate-50 px-4 font-bold italic outline-none transition-all focus:ring-2 focus:ring-blue-600 md:h-14 md:px-6"
                      placeholder={tPublic('contactPlaceholderPhone', '09XXXXXXXX')}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tPublic('messagePortal', 'Message Portal')}</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="w-full bg-slate-50 p-4 font-bold italic outline-none transition-all focus:ring-2 focus:ring-blue-600 md:p-6"
                    placeholder={tPublic('contactPlaceholderMessage', 'HOW CAN WE ASSIST?')}
                  ></textarea>
                </div>
                {submitFeedback ? <p className="text-sm font-semibold text-emerald-700">{submitFeedback}</p> : null}
                {submitError ? <p className="text-sm font-semibold text-rose-700">{submitError}</p> : null}
                <Button disabled={isSubmitting} className="group h-12 w-full rounded-none bg-blue-950 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-blue-600 md:h-14">
                  {isSubmitting ? tPublic('sending', 'Sending...') : tPublic('sendTransmission', 'Send Transmission')} <Send className="ml-4 w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* --- MAP SECTION --- */}
        <div className="space-y-6 md:space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600 mb-2">{tPublic('locationEngine', 'Location Engine')}</h3>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-blue-950 md:text-4xl">{tPublic('findOurPresence', 'Find Our Presence')}</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {cmsBranches.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setActiveBranch(b.name)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all md:px-6 md:py-3 md:tracking-widest ${
                    activeBranch === b.name ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-[420px] grid-cols-1 gap-0 overflow-hidden border border-slate-100 shadow-2xl lg:min-h-[500px] lg:grid-cols-3">
            {/* Map Sidebar */}
            <div className="relative flex flex-col justify-between overflow-hidden bg-blue-950 p-6 text-white md:p-8 lg:p-10">
               <div className="relative z-10">
                 <Navigation2 className="text-blue-500 mb-6 animate-bounce" size={32} />
                 <AnimatePresence mode="wait">
                   <motion.div
                     key={activeBranch}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                   >
                    <h4 className="mb-4 text-2xl font-black uppercase italic tracking-tighter md:text-3xl">{activeBranch}</h4>
                     <p className="text-blue-200 font-bold italic opacity-70 mb-8 max-w-[200px]">
                        {activeBranchData?.location}
                     </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-8">
                      {tPublic('contactHoursLabel', 'Hours')}: {activeBranchData?.officeHours}
                    </p>
                   </motion.div>
                 </AnimatePresence>
                 <Button className="group h-11 rounded-none bg-white px-5 text-[10px] font-black uppercase tracking-widest text-blue-950 hover:bg-blue-400 md:h-12 md:px-8">
                   {tPublic('contactGetDirections', 'Get Directions')} <ChevronRight size={14} className="ml-2 group-hover:translate-x-1" />
                 </Button>
               </div>
               <span className="absolute bottom-0 left-0 text-[120px] font-black text-white/5 uppercase italic select-none pointer-events-none translate-y-10 -translate-x-10">
                 ZMN
               </span>
            </div>

            {/* The Map Frame */}
            <div className="lg:col-span-2 relative bg-slate-200">
               <AnimatePresence mode="wait">
                 <motion.iframe
                   key={activeBranch}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ duration: 1 }}
                   src={toEmbedMapUrl(activeBranchData?.mapUrl, `${activeBranch}, Ethiopia`)}
                   className="w-full h-full grayscale-[0.2] contrast-[1.1]"
                   style={{ border: 0 }}
                   allowFullScreen
                   loading="lazy"
                 />
               </AnimatePresence>
               <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent shadow-[inset_0_0_100px_rgba(0,0,0,0.1)]" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ContactCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="group border border-slate-100 bg-white p-5 transition-colors hover:border-blue-600 md:p-7">
      <div className="mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-base font-black italic tracking-tight text-blue-950 md:text-lg">{value}</p>
    </div>
  );
}
