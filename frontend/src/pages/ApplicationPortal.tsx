import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, ChevronRight, ChevronLeft, 
  ShieldCheck, User, Phone, Landmark, BadgeDollarSign,
  XCircle, FileText, Briefcase, Calendar, MapPin, Camera,
  Loader2
} from 'lucide-react';
import { AppType } from '../App';
import { toast } from 'sonner';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
interface PortalProps {
  type: AppType; // 'membership' or 'loan'
  onBack: () => void;
}

export default function ApplicationPortal({ type, onBack }: PortalProps) {
  const { tPublicUi } = usePublicUiI18n();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  // State for file previews
  const [images, setImages] = useState<{ [key: string]: string | null }>({
    id: null,
    passport: null,
    income: null,
  });

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImages((prev) => ({ ...prev, [key]: imageUrl }));
      toast.info(`${key.toUpperCase()} ${tPublicUi('attachedSuccessfully', 'attached successfully')}`);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const loadingToast = toast.loading(tPublicUi('encryptingAndSubmitting', 'Encrypting and submitting to Zemen Secure Servers...'));

    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(tPublicUi('applicationSubmittedSuccess', 'Application Submitted Successfully!'), {
        id: loadingToast,
        description: "Ref ID: ZM-" + Math.floor(Math.random() * 1000000),
      });
      onBack(); // Return to 'How to Apply' page
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* 1. SECURITY HEADER */}
      <div className="bg-blue-950 py-3 text-center sticky top-0 z-[110]">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3 h-3" /> {tPublicUi('secureEncryptedPortal', 'Secure Encrypted Portal')}
        </p>
      </div>

      <div className="container mx-auto px-6 max-w-5xl mt-12">
        
        {/* 2. HEADER NAVIGATION */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center font-black text-blue-950 italic shadow-sm">
              0{step}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter text-slate-400">{tPublicUi('currentPhase', 'Current Phase')}</h2>
              <p className="text-xs font-bold text-blue-900 italic">{getStepName(step, tPublicUi)}</p>
            </div>
          </div>

          <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-all"
          >
            <XCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            {tPublicUi('exitPortal', 'Exit Portal')}
          </button>
        </div>

        {/* 3. MAIN PORTAL BOX */}
        <div className="bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            
            {/* SIDEBAR */}
            <div className="md:w-1/3 bg-blue-950 p-12 text-white relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-6">
                  {type === 'membership' ? tPublicUi('member', 'Member') : tPublicUi('loan', 'Loan')} <br />
                  <span className="text-blue-400">{tPublicUi('portal', 'Portal')}</span>
                </h1>
                <p className="text-sm text-blue-200 font-bold italic leading-relaxed mb-12">
                  {tPublicUi('verifyDetailsCarefully', 'Verify your details carefully. All submissions are legally binding.')}
                </p>

                <div className="space-y-6">
                  <ProgressIndicator active={step >= 1} label={tPublicUi('identity', 'Identity')} />
                  <ProgressIndicator active={step >= 2} label={tPublicUi('documents', 'Documents')} />
                  <ProgressIndicator active={step >= 3} label={tPublicUi('compliance', 'Compliance')} />
                </div>
              </div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-900 rounded-full blur-3xl opacity-30" />
            </div>

            {/* FORM AREA */}
            <div className="flex-1 p-8 lg:p-16 min-h-[500px]">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: PERSONAL INFO */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <FormHeader icon={<User className="w-5 h-5" />} title={tPublicUi('primaryRecords', 'Primary Records')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label={tPublicUi('fullName', 'Full Name')} icon={<User />} placeholder={tPublicUi('enterLegalName', 'Enter Legal Name')} />
                      <Field label={tPublicUi('phoneNumber', 'Phone Number')} icon={<Phone />} placeholder="+251 ..." />
                      {type === 'membership' ? (
                        <>
                          <Field label={tPublicUi('dateOfBirth', 'Date of Birth')} icon={<Calendar />} type="date" />
                          <Field label={tPublicUi('preferredBranch', 'Preferred Branch')} icon={<MapPin />} placeholder={tPublicUi('addisAbaba', 'Addis Ababa')} />
                        </>
                      ) : (
                        <>
                          <Field label={tPublicUi('memberId', 'Member ID')} icon={<Landmark />} placeholder="ZM-XXXX" />
                          <Field label={tPublicUi('requiredAmount', 'Required Amount')} icon={<BadgeDollarSign />} type="number" placeholder="ETB" />
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: DOCUMENTS */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <FormHeader icon={<FileText className="w-5 h-5" />} title={tPublicUi('documentationHub', 'Documentation Hub')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label={tPublicUi('occupation', 'Occupation')} icon={<Briefcase />} placeholder={tPublicUi('occupationExample', 'e.g. Software Engineer')} />
                      <Field label={type === 'membership' ? tPublicUi('nextOfKin', 'Next of Kin') : tPublicUi('guarantorName', 'Guarantor Name')} icon={<ShieldCheck />} placeholder={tPublicUi('fullName', 'Full Name')} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      <FileUploader title={tPublicUi('idCard', 'ID Card')} icon={<FileText />} preview={images.id} onUpload={(e) => handleFileChange('id', e)} />
                      <FileUploader title={tPublicUi('passportPhoto', 'Passport Photo')} icon={<Camera />} preview={images.passport} onUpload={(e) => handleFileChange('passport', e)} />
                      {type === 'loan' && (
                        <FileUploader title={tPublicUi('incomeProof', 'Income Proof')} icon={<Landmark />} preview={images.income} onUpload={(e) => handleFileChange('income', e)} />
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: SUBMISSION */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center py-10">
                    <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-200">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-blue-950 uppercase italic tracking-tighter">{tPublicUi('readyToReview', 'Ready to Review')}</h3>
                    <p className="text-slate-500 font-bold italic text-sm max-w-sm mx-auto leading-relaxed">
                      {tPublicUi('confirmDocumentsAccurate', 'By clicking finalize, you confirm that all provided documents and information are accurate.')}
                    </p>
                    <div className="flex justify-center pt-6">
                       <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" className="w-5 h-5 accent-blue-600" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-blue-950">{tPublicUi('iAgreeToTerms', 'I Agree to Terms')}</span>
                       </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ACTION BUTTONS */}
              <div className="mt-16 pt-10 border-t border-slate-100 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(s => Math.max(1, s - 1))} 
                  disabled={step === 1 || isSubmitting}
                  className="rounded-none font-black uppercase tracking-widest text-[10px] h-14 px-8"
                >
                  <ChevronLeft className="mr-2 w-4 h-4" /> {tPublicUi('back', 'Back')}
                </Button>
                
                {step < totalSteps ? (
                  <Button 
                    onClick={() => setStep(s => s + 1)}
                    className="bg-blue-600 hover:bg-blue-950 text-white rounded-none px-12 h-14 font-black uppercase tracking-widest text-[10px]"
                  >
                    {tPublicUi('nextPhase', 'Next Phase')} <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    disabled={isSubmitting}
                    onClick={handleFinish}
                    className="bg-blue-950 hover:bg-black text-white rounded-none px-12 h-14 font-black uppercase tracking-widest text-[10px]"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : tPublicUi('finalizeAndSubmit', 'Finalize & Submit')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function getStepName(s: number, tPublicUi: (key: string, fallback?: string) => string) {
  return [
    tPublicUi('identityVerification', 'Identity Verification'),
    tPublicUi('documentation', 'Documentation'),
    tPublicUi('finalCompliance', 'Final Compliance'),
  ][s - 1];
}

function ProgressIndicator({ active, label }: { active: boolean, label: string }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-500 ${active ? 'opacity-100 translate-x-2' : 'opacity-30'}`}>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-400 shadow-[0_0_15px_#60a5fa]' : 'bg-white'}`} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}

function FormHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-100">
      <span className="text-blue-600">{icon}</span>
      <h3 className="text-xl font-black text-blue-950 uppercase italic tracking-tighter leading-none">{title}</h3>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactElement<{ size?: number }>;
}

function Field({ label, icon, ...props }: FieldProps) {
  return (
    <div className="space-y-2 group">
      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-blue-600">
        {label}
      </Label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
          {React.cloneElement(icon, { size: 16 })}
        </div>
        <Input 
          className="rounded-none border-slate-200 bg-slate-50 focus:bg-white h-14 pl-12 font-bold italic text-blue-950 transition-all focus-visible:ring-0 focus-visible:border-blue-600" 
          {...props} 
        />
      </div>
    </div>
  );
}

interface FileUploaderProps {
  title: string;
  icon: React.ReactElement<{ size?: number }>;
  preview: string | null;
  onUpload: React.ChangeEventHandler<HTMLInputElement>;
}

function FileUploader({ title, icon, preview, onUpload }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div 
      onClick={() => inputRef.current?.click()}
      className="aspect-square border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 transition-all group relative overflow-hidden"
    >
      <input type="file" ref={inputRef} onChange={onUpload} hidden accept="image/*" />
      {preview ? (
        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="text-center p-4">
          <div className="text-slate-300 group-hover:text-blue-600 group-hover:scale-110 transition-all mb-2 flex justify-center">
            {React.cloneElement(icon, { size: 24 })}
          </div>
          <h4 className="text-[9px] font-black uppercase text-blue-950">{title}</h4>
        </div>
      )}
    </div>
  );
}
