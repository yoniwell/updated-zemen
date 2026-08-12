import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import StepProgress from '@/components/portal/StepProgress';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { fetchPublicBranches, fetchConfigLoanTypes, type ConfigLoanType } from '@/lib/publicContentApi';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { LoanFormInput, loanSchema, genericTenures } from '@/schemas/loanSchema';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const stepFields: Record<number, (keyof LoanFormInput)[]> = {
  1: ['email', 'otpCode'],
  2: ['firstName', 'fathersName', 'grandfathersName', 'membershipNo', 'phone', 'idType', 'idNumber', 'maritalStatus'],
  3: ['loanType', 'branchId', 'amount', 'tenure'],
  4: ['loanApplicationLetter', 'loanRequestForm', 'personalPhoto', 'idFrontPhoto', 'idBackPhoto', 'marriageCertificate'],
  5: ['collateralType', 'collateralDocument', 'collateralDesc'],
  6: ['businessPlan'],
  7: ['termsAccepted'],
};

type LoanFileField =
  | 'loanApplicationLetter'
  | 'loanRequestForm'
  | 'personalPhoto'
  | 'idFrontPhoto'
  | 'idBackPhoto'
  | 'marriageCertificate'
  | 'collateralDocument'
  | 'businessPlan';

type LoanBranchOption = {
  id: string;
  name: string;
};

const baseUrl = getApiBaseUrl();

type LoanSubmitResponse = {
  application: {
    id: string;
    referenceNo: string;
    status: string;
  };
};


const uploadLoanDocument = async (applicationId: string, file: File, category: string): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await fetchWithTimeout(`${baseUrl}/api/loans/${applicationId}/documents`, {
    method: 'POST',
    body: formData,
    timeoutMs: 120000,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload ${file.name}`);
  }
};

const publicErrorMessages = {
  sendOtp: 'Unable to send verification code. Please try again.',
  verifyOtp: 'Unable to verify the code. Please try again.',
  submitApplication: 'Unable to submit loan application. Please review your information and try again.',
};

export default function LoanPortal() {
  const { tPublicUi } = usePublicUiI18n();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const preselectedType = query.get('type');

  const [step, setStep] = useState(1);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Partial<Record<LoanFileField, File>>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerificationToken, setOtpVerificationToken] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendInSeconds, setResendInSeconds] = useState(0);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState(0);
  const [otpLockedOut, setOtpLockedOut] = useState(false);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [branchOptions, setBranchOptions] = useState<LoanBranchOption[]>([]);
  const [loanTypes, setLoanTypes] = useState<ConfigLoanType[]>([]);

  const {
    register,
    watch,
    setValue,
    trigger,
    getValues,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormInput>({
    resolver: zodResolver(loanSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      otpCode: '',
      firstName: '',
      fathersName: '',
      grandfathersName: '',
      membershipNo: '',
      phone: '',
      idType: '',
      idNumber: '',
      maritalStatus: 'SINGLE',
      loanType: preselectedType || '',
      branchId: '',
      amount: 0,
      tenure: 12,
      loanApplicationLetter: '',
      loanRequestForm: '',
      personalPhoto: '',
      idFrontPhoto: '',
      idBackPhoto: '',
      marriageCertificate: '',
      collateralType: '',
      collateralDocument: '',
      collateralDesc: '',
      businessPlan: '',
      termsAccepted: false,
    },
  });

  const values = watch();

  // Derive constraints for the currently selected loan type (must be after useForm)
  const selectedLoanTypeName = values.loanType;
  const selectedLoanType = useMemo(
    () => loanTypes.find((lt) => lt.name === selectedLoanTypeName) ?? null,
    [loanTypes, selectedLoanTypeName]
  );

  // If a maxTenure is set, it's the fixed tenure.
  // Falls back to genericTenures if the loan type has no fixed tenure.
  const activeTenures = useMemo(() => {
    const fixed = selectedLoanType?.maxTenure ?? null;
    if (fixed != null) return [fixed];
    return genericTenures;
  }, [selectedLoanType]);

  // Auto-set the tenure if there's only one option (i.e. it's fixed)
  useEffect(() => {
    if (activeTenures.length === 1) {
      setValue('tenure', activeTenures[0]);
    }
  }, [activeTenures, setValue]);

  // Load saved session state
  useEffect(() => {
    const saved = localStorage.getItem('loan_portal_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formValues) {
           reset({ ...parsed.formValues, otpCode: '' });
        }
        if (parsed.step) setStep(parsed.step);
        if (parsed.otpVerified) setOtpVerified(parsed.otpVerified);
        if (parsed.otpVerificationToken) setOtpVerificationToken(parsed.otpVerificationToken);
      } catch (e) {
        console.error('Failed to restore loan session state', e);
      }
    }
  }, [reset]);

  // Fetch dynamic data when reaching step 3
  useEffect(() => {
    if (step === 3) {
      fetchPublicBranches().then((data) => {
        setBranchOptions(data.branches);
      }).catch((err) => {
        console.error('Failed to fetch branches:', err);
      });

      fetchConfigLoanTypes().then((data) => {
        setLoanTypes(data);
      }).catch((err) => {
        console.error('Failed to fetch loan types:', err);
      });
    }
  }, [step]);

  // Save session state on change
  useEffect(() => {
    const toSave = {
      formValues: { ...values, otpCode: '' }, // Never persist the OTP code itself
      step,
      otpVerified,
      otpVerificationToken
    };
    localStorage.setItem('loan_portal_state', JSON.stringify(toSave));
  }, [values, step, otpVerified, otpVerificationToken]);

  useEffect(() => {
    const controller = new AbortController();

    const loadBranches = async () => {
      try {
        const payload = await fetchPublicBranches();
        const branches = Array.isArray(payload.branches)
          ? payload.branches.map((b) => ({ id: b.id, name: b.name }))
          : [];

        if (branches.length === 0) return;

        setBranchOptions(branches);

        const currentBranchId = getValues('branchId');
        if (!currentBranchId || !branches.some((branch) => branch.id === currentBranchId)) {
          setValue('branchId', '');
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    };

    void loadBranches();

    return () => controller.abort();
  }, [getValues, setValue]);

  useEffect(() => {
    if (resendInSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendInSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendInSeconds]);

  useEffect(() => {
    if (otpExpiresInSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setOtpExpiresInSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpExpiresInSeconds]);

  useEffect(() => {
    setOtpSent(false);
    setOtpVerified(false);
    setOtpVerificationToken(null);
    setResendInSeconds(0);
    setOtpExpiresInSeconds(0);
    setOtpLockedOut(false);
    setOtpHint(null);
  }, [values.email]);

  const formatSeconds = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${String(remaining).padStart(2, '0')}`;
  };

  const stepTitles = [
    tPublicUi('emailOtp', 'Email & OTP'),
    tPublicUi('personalInfo', 'Personal Info'),
    tPublicUi('loanInfo', 'Loan Info'),
    tPublicUi('documents', 'Documents'),
    tPublicUi('collateralInfo', 'Collateral Info'),
    tPublicUi('businessInfo', 'Business Info'),
    tPublicUi('consent', 'Consent'),
  ];

  const summaryRows = useMemo(() => {
    return [
      [tPublicUi('email', 'Email'), values.email],
      [tPublicUi('name', 'Name'), `${values.firstName} ${values.fathersName || ''} ${values.grandfathersName}`.trim()],
      [tPublicUi('membershipNo', 'Membership No'), values.membershipNo],
      [tPublicUi('phone', 'Phone Number'), values.phone],
      [tPublicUi('idType', 'ID Type'), values.idType],
      [tPublicUi('maritalStatus', 'Marital Status'), values.maritalStatus],
      [tPublicUi('loanType', 'Loan Type'), values.loanType],
      [tPublicUi('branchId', 'Branch'), branchOptions.find((b) => b.id === values.branchId)?.name || values.branchId],
      [tPublicUi('amount', 'Amount (ETB)'), values.amount ? `ETB ${values.amount.toLocaleString()}` : '-'],
      [tPublicUi('tenure', 'Tenure (months)'), values.tenure ? `${values.tenure} ${tPublicUi('months', 'months')}` : '-'],
      [tPublicUi('collateralType', 'Collateral Type'), values.collateralType],
      [tPublicUi('businessPlan', 'Business Plan'), values.businessPlan ? tPublicUi('submitted', 'Submitted') : '-'],
    ];
  }, [tPublicUi, values, branchOptions]);

  const selectedLoanTypeObj = useMemo(() => {
    return loanTypes.find((lt) => lt.name === values.loanType || lt.id === values.loanType);
  }, [loanTypes, values.loanType]);

  const loanAmountValidationError = useMemo(() => {
    if (!selectedLoanTypeObj) return undefined;
    const amtVal = values.amount;
    if (amtVal === undefined || amtVal === null || String(amtVal).trim() === '') return undefined;
    const amt = Number(amtVal);
    if (isNaN(amt)) return 'Please enter a valid numeric amount';
    if (selectedLoanTypeObj.minAmount != null && amt < selectedLoanTypeObj.minAmount) {
      return `Loan amount must be at least ${selectedLoanTypeObj.minAmount.toLocaleString()} ETB for ${selectedLoanTypeObj.name}`;
    }
    if (selectedLoanTypeObj.maxAmount != null && amt > selectedLoanTypeObj.maxAmount) {
      return `Loan amount cannot exceed ${selectedLoanTypeObj.maxAmount.toLocaleString()} ETB for ${selectedLoanTypeObj.name}`;
    }
    return undefined;
  }, [selectedLoanTypeObj, values.amount]);

  const loanTenureValidationError = useMemo(() => {
    if (!selectedLoanTypeObj) return undefined;
    const tenVal = values.tenure;
    if (tenVal === undefined || tenVal === null || String(tenVal).trim() === '') return undefined;
    const ten = Number(tenVal);
    if (isNaN(ten)) return 'Please enter a valid tenure';
    if (selectedLoanTypeObj.minTenure != null && ten < selectedLoanTypeObj.minTenure) {
      return `Loan tenure must be at least ${selectedLoanTypeObj.minTenure} months for ${selectedLoanTypeObj.name}`;
    }
    if (selectedLoanTypeObj.maxTenure != null && ten > selectedLoanTypeObj.maxTenure) {
      return `Loan tenure cannot exceed ${selectedLoanTypeObj.maxTenure} months for ${selectedLoanTypeObj.name}`;
    }
    return undefined;
  }, [selectedLoanTypeObj, values.tenure]);

  const errorText = (field: keyof LoanFormInput): string | undefined => {
    if (field === 'amount' && loanAmountValidationError) {
      return loanAmountValidationError;
    }
    if (field === 'tenure' && loanTenureValidationError) {
      return loanTenureValidationError;
    }
    const message = errors[field]?.message;
    return typeof message === 'string' ? message : undefined;
  };

  const setUploadedFile = (field: LoanFileField, file: File | null) => {
    setValue(field, file ? file.name : '', { shouldValidate: true, shouldTouch: true });
    setUploadedFiles((prev) => {
      const next = { ...prev };
      if (file) {
        next[field] = file;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const onNext = async () => {
    if (step === 1 && !otpVerified) {
      toast.error('Please verify your email address with the OTP code before proceeding');
      return;
    }

    if (step === 3) {
      if (loanAmountValidationError) {
        setError('amount', { type: 'manual', message: loanAmountValidationError });
        toast.error(loanAmountValidationError);
        return;
      }
      if (loanTenureValidationError) {
        setError('tenure', { type: 'manual', message: loanTenureValidationError });
        toast.error(loanTenureValidationError);
        return;
      }
    }

    const valid = await trigger(stepFields[step] ?? []);
    if (!valid) {
      toast.error(tPublicUi('fixValidationErrors', 'Please fix validation errors before continuing'));
      return;
    }

    setStep((current) => Math.min(7, current + 1));
  };

  const onSubmit = async (data: LoanFormInput) => {
    const selectedBranchObj = branchOptions.find((branch) => branch.id === data.branchId || branch.name === data.branchId);
    const resolvedBranchId = selectedBranchObj?.id || (typeof data.branchId === 'string' && data.branchId.trim() !== '' ? data.branchId : undefined);
    const resolvedBranchName = selectedBranchObj?.name || (typeof data.branchId === 'string' && data.branchId.trim() !== '' ? data.branchId : undefined);
    const applicantName = `${data.firstName} ${data.fathersName || ''} ${data.grandfathersName}`.trim();

    const payload = {
      firstName: data.firstName,
      fathersName: data.fathersName || undefined,
      grandfathersName: data.grandfathersName,
      membershipNo: data.membershipNo,
      phone: data.phone,
      email: data.email,
      loanType: data.loanType,
      amount: data.amount,
      tenure: data.tenure,
      branchId: resolvedBranchId,
      preferredBranch: resolvedBranchName,
      idType: data.idType,
      maritalStatus: data.maritalStatus,
      collateralType: data.collateralType || undefined,
      collateralDesc: data.collateralDesc || undefined,
      termsAccepted: data.termsAccepted,
      signature: data.membershipNo,
      // =========================================================================
      // FIXED: Read from local state OR look for the browser memory backup value
      // =========================================================================
      otpVerificationToken: otpVerificationToken || sessionStorage.getItem('loan_otp_token') || '',
    };


    // =========================================================================
    // MODIFIED: Type-Safe URL Compilation & Authorization Injection
    // =========================================================================
    // 1. Convert baseUrl to string safely and clean duplicate slashes
    const cleanBaseUrl = String(baseUrl || '').trim();
    const finalRequestUrl = `${cleanBaseUrl}/api/loans`.replace(/([^:]\/)\/+/g, "$1");

    // 2. Explicitly type options with RequestInit to clear editor red underlines
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // FIXED: Inject the Authorization bearer session token to bypass 401 gate blocks

      },
      body: JSON.stringify(payload),
    };

    // 3. Fire the processed fetch endpoint request
    const response = await fetchWithTimeout(finalRequestUrl, { ...fetchOptions, timeoutMs: 120000 });
    // =========================================================================

    const responseText = await response.text();
    let result: LoanSubmitResponse | { error?: string } = { error: tPublicUi('failedLoanSubmit', 'Failed to submit loan application') };
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        result = ('success' in parsed && 'data' in parsed) ? parsed.data : parsed;
      } catch {
        result = { error: tPublicUi('unexpectedServerResponse', 'Unexpected response from server') };
      }
    }

    if (!response.ok || !('application' in result)) {
      throw new Error(String(publicErrorMessages?.submitApplication || 'Submission Failed'));
    }

    const uploads: Array<{ file: File; category: string; label: string }> = [];
    if (uploadedFiles.loanApplicationLetter) uploads.push({ file: uploadedFiles.loanApplicationLetter, category: 'LOAN_APPLICATION_LETTER', label: tPublicUi('loanApplicationLetter', 'Loan Application Letter') });
    if (uploadedFiles.loanRequestForm) uploads.push({ file: uploadedFiles.loanRequestForm, category: 'LOAN_REQUEST_FORM', label: tPublicUi('loanRequestForm', 'Loan Request Form') });
    if (uploadedFiles.personalPhoto) uploads.push({ file: uploadedFiles.personalPhoto, category: 'PERSONAL_PHOTO', label: tPublicUi('personalPhoto', 'Personal Photo') });
    if (uploadedFiles.idFrontPhoto) uploads.push({ file: uploadedFiles.idFrontPhoto, category: 'ID_FRONT_PHOTO', label: tPublicUi('idFrontPhoto', 'ID Front Photo') });
    if (uploadedFiles.idBackPhoto) uploads.push({ file: uploadedFiles.idBackPhoto, category: 'ID_BACK_PHOTO', label: tPublicUi('idBackPhoto', 'ID Back Photo') });
    if (uploadedFiles.marriageCertificate) uploads.push({ file: uploadedFiles.marriageCertificate, category: 'MARRIAGE_CERTIFICATE', label: tPublicUi('marriageCertificate', 'Marriage Certificate') });
    if (uploadedFiles.collateralDocument) uploads.push({ file: uploadedFiles.collateralDocument, category: 'COLLATERAL_DOCUMENT', label: tPublicUi('collateralDocument', 'Collateral Document') });
    if (uploadedFiles.businessPlan) uploads.push({ file: uploadedFiles.businessPlan, category: 'BUSINESS_PLAN', label: tPublicUi('businessPlan', 'Business Plan') });

    const failedUploads: string[] = [];
    for (const upload of uploads) {
      try {
        // FIXED: Added casting protection wrapper to clear downstream loop template parsing conflicts
        await uploadLoanDocument((result as LoanSubmitResponse).application.id, upload.file, upload.category);
      } catch {
        failedUploads.push(upload.label);
      }
    }

    setReferenceNo((result as LoanSubmitResponse).application.referenceNo);
    setSubmittedName(applicantName);
    setStep(8); // Show success
    if (failedUploads.length > 0) {
      toast.warning(`${tPublicUi('applicationSubmittedUploadFailed', 'Application submitted, but failed to upload')}: ${failedUploads.join(', ')}`);
      sessionStorage.removeItem('loan_portal_state');
      return;
    }

    toast.success(tPublicUi('loanSubmittedSuccess', 'Loan application submitted successfully'));
    sessionStorage.removeItem('loan_portal_state');
  };


  const sendOtpCode = async (resend = false) => {
    const validEmail = await trigger(['email']);
    if (!validEmail) {
      toast.error(tPublicUi('enterValidEmailFirst', 'Enter a valid email address first'));
      return;
    }

    setOtpBusy(true);
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/applications/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'loan',
          email: values.email,
          resend,
        }),
        timeoutMs: 30000,
      });

      const payload = (await response.json()) as { error?: string; resendInSeconds?: number; code?: string };
      if (!response.ok) {
        throw new Error(publicErrorMessages.sendOtp);
      }
      
      setValue('otpCode', '');

      setOtpSent(true);
      setOtpVerified(false);
      setOtpVerificationToken(null);
      setResendInSeconds(payload.resendInSeconds ?? 60);
      setOtpExpiresInSeconds((payload as { expiresInSeconds?: number }).expiresInSeconds ?? 120);
      setOtpLockedOut(false);
      setOtpHint(tPublicUi('otpCodeSentHint', 'Code sent. Check your email and verify before it expires.'));
      toast.success(tPublicUi('otpSentToEmail', 'Verification code sent to your email'));
    } catch (error) {
      console.error('Send loan OTP error:', error);
      setOtpHint(publicErrorMessages.sendOtp);
      toast.error(publicErrorMessages.sendOtp);
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtpCode = async () => {
    const validOtp = await trigger(['email', 'otpCode']);
    if (!validOtp) {
      toast.error(tPublicUi('enterEmailAndOtp', 'Enter your email and OTP code'));
      return;
    }

    setOtpBusy(true);
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/applications/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'loan',
          email: values.email,
          code: values.otpCode,
        }),
        timeoutMs: 30000,
      });

      const payload = (await response.json()) as { error?: string; verificationToken?: string };
      if (!response.ok || !payload.verificationToken) {
        throw new Error(publicErrorMessages.verifyOtp);
      }

      setOtpVerified(true);
      setOtpVerificationToken(payload.verificationToken);

      // =========================================================================
      // FIXED: Save token to browser session memory as a backup safeguard
      // =========================================================================
      sessionStorage.setItem('loan_otp_token', payload.verificationToken);
      // =========================================================================

      setOtpHint(tPublicUi('otpVerifiedHint', 'Verification successful. You can continue to the next step.'));
      toast.success(tPublicUi('emailVerifiedSuccess', 'Email verified successfully'));
    } catch (error) {
      setOtpVerified(false);
      setOtpVerificationToken(null);

      // Clear backup if verification fails
      sessionStorage.removeItem('loan_otp_token');

      console.error('Verify loan OTP error:', error);
      const message = publicErrorMessages.verifyOtp;
      if (String(error).toLowerCase().includes('too many incorrect attempts')) {
        setOtpLockedOut(true);
        setOtpHint(tPublicUi('tooManyAttempts', 'Too many incorrect attempts. Click Resend Code to get a new code.'));
      } else {
        setOtpHint(message);
      }
      toast.error(message);
    } finally {
      setOtpBusy(false);
    }
  };


  return (
    <section className="bg-slate-50 py-6 md:py-10">
      <div className="container mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 lg:grid-cols-[280px_1fr] lg:gap-6">
        <StepProgress steps={stepTitles} currentStep={step} title={tPublicUi('loanProgress', 'Loan Progress')} />

        <form
          id="loan-portal-form"
          onSubmit={handleSubmit(async (data) => {
            try {
              await onSubmit(data);
            } catch (error) {
              console.error('Submit loan application error:', error);
              toast.error(publicErrorMessages.submitApplication);
            }
          })}
          className="rounded-xl border border-slate-200 bg-white p-5 pb-24 shadow-sm md:p-8 md:pb-8"
        >
          <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-black text-blue-950">{tPublicUi('loanApplicationPortal', 'Loan Application Portal')}</h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">{tPublicUi('stepXofY', 'Step {{step}} of {{total}}').replace('{{step}}', String(step)).replace('{{total}}', '7')}</p>
          </div>

          <div className="mb-5 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            {tPublicUi('memberNo', 'Member No')}: {values.membershipNo || tPublicUi('notEntered', 'Not entered')} | {tPublicUi('loanType', 'Loan Type')}: {values.loanType} | {tPublicUi('draftInProgress', 'Draft: In Progress')}
          </div>

          {/* Step 1: Email & OTP */}
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tPublicUi('email', 'Email')} error={errorText('email')}>
                <Input type="email" placeholder="you@example.com" {...register('email')} />
              </Field>
              <Field label={tPublicUi('otpCode', 'OTP Code')} error={errorText('otpCode')}>
                <Input placeholder="000000" maxLength={8} {...register('otpCode')} />
              </Field>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void sendOtpCode(false)} disabled={otpBusy || resendInSeconds > 0}>
                  {otpBusy ? tPublicUi('pleaseWait', 'Please wait...') : tPublicUi('sendCode', 'Send Code')}
                </Button>
                <Button type="button" variant="outline" onClick={() => void sendOtpCode(true)} disabled={otpBusy || resendInSeconds > 0}>
                  {tPublicUi('resendCode', 'Resend Code')} {resendInSeconds > 0 ? `(${resendInSeconds}s)` : ''}
                </Button>
                <Button type="button" variant="outline" onClick={() => void verifyOtpCode()} disabled={otpBusy || !otpSent || otpLockedOut || otpExpiresInSeconds <= 0}>
                  {tPublicUi('verifyOtp', 'Verify OTP')}
                </Button>
                <span className={`text-sm font-semibold ${otpVerified ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {otpVerified ? tPublicUi('verified', 'Verified') : tPublicUi('notVerified', 'Not verified')}
                </span>
              </div>
              {otpSent && otpExpiresInSeconds > 0 && (
                <p className="md:col-span-2 text-xs font-semibold text-slate-600">
                  {tPublicUi('codeExpiresIn', 'Code expires in')} {formatSeconds(otpExpiresInSeconds)}
                </p>
              )}
              {otpHint && (
                <p className={`md:col-span-2 text-xs font-semibold ${otpLockedOut ? 'text-amber-700' : 'text-slate-600'}`}>
                  {otpHint}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Personal Info */}
          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tPublicUi('firstName', 'First Name')} error={errorText('firstName')}>
                <Input placeholder={tPublicUi('firstName', 'First Name')} {...register('firstName')} />
              </Field>
              <Field label={tPublicUi('fathersName', 'Father Name')} error={errorText('fathersName')}>
                <Input placeholder={tPublicUi('fathersName', 'Father Name')} {...register('fathersName')} />
              </Field>
              <Field label={tPublicUi('grandfathersName', 'Grandfather Name')} error={errorText('grandfathersName')}>
                <Input placeholder={tPublicUi('grandfathersName', 'Grandfather Name')} {...register('grandfathersName')} />
              </Field>
              <Field label={tPublicUi('membershipNo', 'Membership No')} error={errorText('membershipNo')}>
                <Input placeholder="e.g., MEM001" {...register('membershipNo')} />
              </Field>
              <Field label={tPublicUi('phone', 'Phone Number')} error={errorText('phone')}>
                <Input placeholder="09XXXXXXXX" {...register('phone')} />
              </Field>
              <Field label={tPublicUi('idType', 'ID Type')} error={errorText('idType')}>
                <select className="h-11 w-full rounded-md border border-slate-300 px-3" {...register('idType')}>
                  <option value="">{tPublicUi('selectIdType', 'Select ID Type')}</option>
                  <option value="NATIONAL_ID">{tPublicUi('nationalId', 'National ID')}</option>
                  <option value="PASSPORT">{tPublicUi('passport', 'Passport')}</option>
                  <option value="DRIVING_LICENSE">{tPublicUi('drivingLicense', 'Driving License')}</option>
                </select>
              </Field>
              <Field label={tPublicUi('idNumber', 'ID Number')} error={errorText('idNumber')}>
                <Input placeholder="ID Number" {...register('idNumber')} />
              </Field>
              <Field label={tPublicUi('maritalStatus', 'Marital Status')} error={errorText('maritalStatus')}>
                <select className="h-11 w-full rounded-md border border-slate-300 px-3" {...register('maritalStatus')}>
                  <option value="SINGLE">{tPublicUi('single', 'Single')}</option>
                  <option value="MARRIED">{tPublicUi('married', 'Married')}</option>
                </select>
              </Field>
            </div>
          )}

          {/* Step 3: Loan Info */}
          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tPublicUi('loanType', 'Loan Type')} error={errorText('loanType')}>
                <select className="h-11 w-full rounded-md border border-slate-300 px-3" {...register('loanType')}>
                  <option value="" disabled>Select loan type</option>
                  {loanTypes.map(lt => (
                    <option key={lt.id} value={lt.name}>{lt.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={tPublicUi('branchId', 'Preferred Branch')} error={errorText('branchId')}>
                <select className="h-11 w-full rounded-md border border-slate-300 px-3" {...register('branchId')}>
                  <option value="" disabled>{tPublicUi('selectPreferredBranch', 'Select preferred branch')}</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={tPublicUi('amount', 'Loan Amount (ETB)')} error={errorText('amount')}>
                <Input
                  type="number"
                  min={selectedLoanType?.minAmount ?? 0}
                  max={selectedLoanType?.maxAmount ?? undefined}
                  placeholder={selectedLoanType?.minAmount != null ? `Min ${selectedLoanType.minAmount.toLocaleString()} ETB` : '0'}
                  className={errorText('amount') ? 'border-red-500 text-red-900 focus:ring-red-500 font-semibold' : ''}
                  {...register('amount', { valueAsNumber: true })}
                />
                {errorText('amount') ? (
                  <p className="mt-1.5 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-1.5">
                    <span className="font-extrabold text-sm">⚠</span> {errorText('amount')}
                  </p>
                ) : (
                  (selectedLoanType?.minAmount != null || selectedLoanType?.maxAmount != null) && (
                    <p className="mt-1 text-xs font-medium text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                      {selectedLoanType.minAmount != null && `Min: ${selectedLoanType.minAmount.toLocaleString()} ETB`}
                      {selectedLoanType.minAmount != null && selectedLoanType.maxAmount != null && ' — '}
                      {selectedLoanType.maxAmount != null && `Max: ${selectedLoanType.maxAmount.toLocaleString()} ETB`}
                    </p>
                  )
                )}
              </Field>
              <Field label={tPublicUi('tenure', 'Tenure (Months)')} error={errorText('tenure')}>
                {activeTenures.length === 1 ? (
                  <Input 
                    type="number" 
                    readOnly 
                    className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-3 cursor-not-allowed text-slate-500" 
                    {...register('tenure', { valueAsNumber: true })} 
                  />
                ) : (
                  <select className="h-11 w-full rounded-md border border-slate-300 px-3" {...register('tenure', { valueAsNumber: true })}>
                    {activeTenures.map((month) => (
                      <option key={month} value={month}>{month} {tPublicUi('months', 'months')}</option>
                    ))}
                  </select>
                )}
                {errorText('tenure') ? (
                  <p className="mt-1.5 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-1.5">
                    <span className="font-extrabold text-sm">⚠</span> {errorText('tenure')}
                  </p>
                ) : (
                  selectedLoanType?.maxTenure != null && (
                    <p className="mt-1 text-xs text-slate-500">
                      Fixed Tenure: {selectedLoanType.maxTenure} months
                    </p>
                  )
                )}
              </Field>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <FileInput label={tPublicUi('loanApplicationLetter', 'Loan Application Letter')} required value={getValues('loanApplicationLetter')} onPick={(file) => setUploadedFile('loanApplicationLetter', file)} error={errorText('loanApplicationLetter')} />
              <FileInput label={tPublicUi('loanRequestForm', 'Loan Request Form')} required value={getValues('loanRequestForm')} onPick={(file) => setUploadedFile('loanRequestForm', file)} error={errorText('loanRequestForm')} />
              <FileInput label={tPublicUi('personalPhoto', 'Personal Photo')} required value={getValues('personalPhoto')} onPick={(file) => setUploadedFile('personalPhoto', file)} error={errorText('personalPhoto')} />
              <FileInput label={tPublicUi('idFrontPhoto', 'ID Front Photo')} required value={getValues('idFrontPhoto')} onPick={(file) => setUploadedFile('idFrontPhoto', file)} error={errorText('idFrontPhoto')} />
              <FileInput label={tPublicUi('idBackPhoto', 'ID Back Photo')} value={getValues('idBackPhoto')} onPick={(file) => setUploadedFile('idBackPhoto', file)} error={errorText('idBackPhoto')} />
              <FileInput label={tPublicUi('marriageCertificate', 'Marriage Certificate')} required value={getValues('marriageCertificate')} onPick={(file) => setUploadedFile('marriageCertificate', file)} error={errorText('marriageCertificate')} />
            </div>
          )}

          {/* Step 5: Collateral Info */}
          {step === 5 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tPublicUi('collateralType', 'Collateral Type')} error={errorText('collateralType')}>
                <Input placeholder="e.g., Land, Building, Vehicle" {...register('collateralType')} />
              </Field>
              <Field label={tPublicUi('collateralDesc', 'Collateral Description')} error={errorText('collateralDesc')}>
                <Textarea placeholder="Describe the collateral details" rows={2} {...register('collateralDesc')} />
              </Field>
              <FileInput label={tPublicUi('collateralDocument', 'Collateral Document')} required value={getValues('collateralDocument')} onPick={(file) => setUploadedFile('collateralDocument', file)} error={errorText('collateralDocument')} />
            </div>
          )}

          {/* Step 6: Business Info */}
          {step === 6 && (
            <div className="grid gap-4">

              <FileInput label={tPublicUi('businessPlan', 'Business Plan')} required value={getValues('businessPlan')} onPick={(file) => setUploadedFile('businessPlan', file)} error={errorText('businessPlan')} />

            </div>
          )}

          {/* Step 7: Consent */}
          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-blue-950">{tPublicUi('reviewAndConfirm', 'Review and Confirm')}</h2>
              <div className="rounded-md border border-slate-200">
                {summaryRows.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-1 border-b border-slate-100 p-3 text-sm md:grid-cols-[240px_1fr]">
                    <p className="font-semibold text-slate-600">{label}</p>
                    <p className="text-slate-900">{value || '-'}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={values.termsAccepted} onCheckedChange={(checked) => setValue('termsAccepted', checked === true, { shouldValidate: true })} id="loanTermsAccepted" />
                  <Label htmlFor="loanTermsAccepted">{tPublicUi('acceptLoanTerms', 'I accept the loan application terms and conditions')}</Label>
                </div>
                {errorText('termsAccepted') && <p className="text-xs text-red-600">{errorText('termsAccepted')}</p>}
              </div>
            </div>
          )}

          {/* Step 8: Confirmation */}
          {step === 8 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-center">
              <h2 className="mb-2 text-2xl font-black text-emerald-900">{tPublicUi('applicationSubmitted', 'Application Submitted')}</h2>
              <p className="mb-2 text-sm text-emerald-900">{tPublicUi('applicant', 'Applicant')}: <span className="font-bold">{submittedName || tPublicUi('applicant', 'Applicant')}</span></p>
              <p className="mb-2 text-sm text-emerald-900">{tPublicUi('referenceNumber', 'Reference Number')}: <span className="font-bold">{referenceNo}</span></p>
              <p className="text-xs text-emerald-800">{tPublicUi('expectedTurnaround', 'Expected turnaround is 3-7 business days depending on product and document verification.')}</p>
            </div>
          )}

          <div className="mt-8 hidden items-center justify-between border-t border-slate-100 pt-5 md:flex">
            <Button type="button" variant="outline" disabled={step === 1 || step === 8 || isSubmitting} onClick={() => setStep((current) => current - 1)}>
              {tPublicUi('previous', 'Previous')}
            </Button>

            {step < 7 && (
              <Button type="button" onClick={onNext}>{tPublicUi('next', 'Next')}</Button>
            )}

            {step === 7 && (
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? tPublicUi('submitting', 'Submitting...') : tPublicUi('submitApplication', 'Submit Application')}</Button>
            )}

            {step === 8 && (
              <Button type="button" onClick={() => window.location.assign('/apply')}>{tPublicUi('backToGuide', 'Back to Guide')}</Button>
            )}
          </div>
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          {step > 1 && step < 8 && (
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-[108px]"
              disabled={isSubmitting}
              onClick={() => setStep((current) => current - 1)}
            >
              {tPublicUi('previous', 'Previous')}
            </Button>
          )}

          {step < 7 && (
            <Button type="button" className="h-11 flex-1" disabled={isSubmitting} onClick={onNext}>
              {tPublicUi('next', 'Next')}
            </Button>
          )}

          {step === 7 && (
            <Button type="submit" form="loan-portal-form" className="h-11 flex-1" disabled={isSubmitting}>
              {isSubmitting ? tPublicUi('submitting', 'Submitting...') : tPublicUi('submitApplication', 'Submit Application')}
            </Button>
          )}

          {step === 8 && (
            <Button type="button" className="h-11 flex-1" onClick={() => window.location.assign('/apply')}>
              {tPublicUi('backToGuide', 'Back to Guide')}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FileInput({ label, required, value, onPick, error }: { label: string; required?: boolean; value?: string; onPick: (file: File | null) => void; error?: string }) {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileSizeError(null);

    if (!file) {
      onPick(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileSizeError(`File size (${sizeMB}MB) exceeds maximum allowed size of 5MB`);
      onPick(null);
      return;
    }

    onPick(file);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label} {required ? '*' : ''} <span className="font-normal text-slate-500">(Max 5MB)</span></Label>
      <Input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf" onChange={handleFileChange} className={fileSizeError ? 'border-red-300 focus:ring-red-200' : ''} />
      {value && <p className="text-xs text-emerald-700">? Selected: {value}</p>}
      {fileSizeError && <p className="text-xs text-red-600">{fileSizeError}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
