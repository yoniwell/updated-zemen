import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import StepProgress from '@/components/portal/StepProgress';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { fetchPublicBranches, fetchConfigSavingTypes, type ConfigSavingType } from '@/lib/publicContentApi';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { MembershipFormInput, membershipSchema } from '@/schemas/membershipSchema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const stepFields: Record<number, (keyof MembershipFormInput)[]> = {
  1: ['email', 'otpCode'],
  2: ['phone', 'firstName', 'fathersName', 'grandfathersName'],
  3: ['idType', 'idNumber', 'idFrontName', 'idBackName'],
  4: ['applicantPhotoName', 'filledFormName'],
  5: ['membershipPaymentAmount', 'membershipPaymentProofName', 'savingType', 'savingPaymentAmount', 'savingTransactionRef', 'savingProofName', 'preferredBranch', 'termsAccepted'],
};

const initialValues: Partial<MembershipFormInput> = {
  phone: '',
  email: '',
  otpCode: '',
  firstName: '',
  fathersName: '',
  grandfathersName: '',
  idType: 'NATIONAL_ID',
  idNumber: '',
  idFrontName: '',
  idBackName: '',
  applicantPhotoName: '',
  filledFormName: '',
  membershipPaymentAmount: undefined,
  membershipPaymentProofName: '',
  savingType: undefined,
  savingPaymentAmount: undefined,
  savingTransactionRef: '',
  savingProofName: '',
  preferredBranch: '',
  termsAccepted: false,
};

const baseUrl = getApiBaseUrl();

type MembershipSubmitResponse = {
  application: {
    id: string;
    referenceNo: string;
    status: string;
  };
};

type MembershipFileField = 'idFrontName' | 'idBackName' | 'applicantPhotoName' | 'filledFormName' | 'membershipPaymentProofName' | 'savingProofName';

type MembershipBranchOption = {
  id: string;
  name: string;
};

const uploadMembershipDocument = async (applicationId: string, file: File, category: string): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await fetchWithTimeout(`${baseUrl}/api/membership/${applicationId}/documents`, {
    method: 'POST',
    body: formData,
    timeoutMs: 120000,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Failed to upload ${file.name}`);
  }
};

const publicErrorMessages = {
  sendOtp: 'Unable to send verification code. Please try again.',
  verifyOtp: 'Unable to verify the code. Please try again.',
  submitApplication: 'Unable to submit membership application. Please review your information and try again.',
};

export default function MembershipPortal() {
  const { tPublicUi } = usePublicUiI18n();
  const [step, setStep] = useState(1);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Partial<Record<MembershipFileField, File>>>({});
  const submitIntentRef = useRef(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerificationToken, setOtpVerificationToken] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendInSeconds, setResendInSeconds] = useState(0);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState(0);
  const [savingTypes, setSavingTypes] = useState<ConfigSavingType[]>([]);
  const [otpLockedOut, setOtpLockedOut] = useState(false);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [branchOptions, setBranchOptions] = useState<MembershipBranchOption[]>([]);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MembershipFormInput>({
    resolver: zodResolver(membershipSchema),
    mode: 'onTouched',
    defaultValues: initialValues,
  });

  const values = watch();

  // Load saved session state
  useEffect(() => {
    const saved = localStorage.getItem('membership_portal_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formValues) {
           reset({ ...initialValues, ...parsed.formValues, otpCode: '' });
        }
        if (parsed.step) setStep(parsed.step);
        if (parsed.otpVerified) setOtpVerified(parsed.otpVerified);
        if (parsed.otpVerificationToken) setOtpVerificationToken(parsed.otpVerificationToken);
      } catch (e) {
        console.error('Failed to restore membership session state', e);
      }
    }
  }, [reset]);

  // Fetch dynamic data
  useEffect(() => {
    if (step === 5) {
      fetchPublicBranches().then((data) => {
        setBranchOptions(data.branches);
      }).catch((err) => {
        console.error('Failed to fetch branches:', err);
      });

      fetchConfigSavingTypes().then((data) => {
        setSavingTypes(data);
      }).catch((err) => {
        console.error('Failed to fetch saving types:', err);
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
    localStorage.setItem('membership_portal_state', JSON.stringify(toSave));
  }, [values, step, otpVerified, otpVerificationToken]);

  useEffect(() => {
    const controller = new AbortController();

    const loadBranches = async () => {
      try {
        const payload = await fetchPublicBranches();
        const branches = Array.isArray(payload.branches)
          ? Array.from(
            new Map(
              payload.branches
                .map((branch) => ({ id: branch.id.trim(), name: branch.name.trim() }))
                .filter((branch) => branch.id || branch.name)
                .map((branch) => [branch.id || branch.name, branch] as const)
            ).values()
          )
          : [];

        if (branches.length === 0) return;

        setBranchOptions(branches);

        const currentPreferredBranch = getValues('preferredBranch');
        if (!currentPreferredBranch || !branches.some((branch) => branch.name === currentPreferredBranch)) {
          setValue('preferredBranch', '');
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
    tPublicUi('startAndContact', 'Start & Contact'),
    tPublicUi('personalInformation', 'Personal Information'),
    tPublicUi('kycDocuments', 'KYC Documents'),
    tPublicUi('employment', 'Employment'),
    tPublicUi('preferencesAndConsent', 'Preferences & Consent'),
    tPublicUi('reviewAndSubmit', 'Review & Submit'),
  ];

  const requiresIdBack = values.idType === 'NATIONAL_ID';

  const reviewRows = useMemo<Array<[string, string | number]>>(
    () => [
      ['Phone', values.phone],
      ['Email', values.email || 'N/A'],
      ['Name', `${values.firstName} ${values.fathersName || ''} ${values.grandfathersName || ''}`.trim()],
      ['ID Type', values.idType],
      ['ID Number', values.idNumber],
      ['Preferred Branch', values.preferredBranch || '-'],
      ['Membership Payment', Number(values.membershipPaymentAmount ?? 0)],
      ['Saving Type', values.savingType || '-'],
      ['Saving Payment', Number(values.savingPaymentAmount ?? 0)],
    ],
    [values]
  );

  const selectedSavingTypeObj = useMemo(() => {
    return savingTypes.find((st) => st.name === values.savingType || st.id === values.savingType);
  }, [savingTypes, values.savingType]);

  const savingAmountValidationError = useMemo(() => {
    if (!selectedSavingTypeObj) return undefined;
    const amtStr = values.savingPaymentAmount;
    if (amtStr === undefined || amtStr === null || String(amtStr).trim() === '') return undefined;
    const amt = Number(amtStr);
    if (isNaN(amt)) return 'Please enter a valid numeric amount';
    if (selectedSavingTypeObj.minAmount != null && amt < selectedSavingTypeObj.minAmount) {
      return `Saving payment amount must be at least ${selectedSavingTypeObj.minAmount.toLocaleString()} ETB for ${selectedSavingTypeObj.name}`;
    }
    if (selectedSavingTypeObj.maxAmount != null && amt > selectedSavingTypeObj.maxAmount) {
      return `Saving payment amount cannot exceed ${selectedSavingTypeObj.maxAmount.toLocaleString()} ETB for ${selectedSavingTypeObj.name}`;
    }
    return undefined;
  }, [selectedSavingTypeObj, values.savingPaymentAmount]);

  const errorText = (field: keyof MembershipFormInput): string | undefined => {
    if (field === 'savingPaymentAmount' && savingAmountValidationError) {
      return savingAmountValidationError;
    }
    const msg = errors[field]?.message;
    return typeof msg === 'string' ? msg : undefined;
  };

  const onNext = async () => {
    submitIntentRef.current = false;
    if (step === 1 && !otpVerified) {
      toast.error('Please verify your email address with the OTP code before proceeding');
      return;
    }

    if (step === 5 && savingAmountValidationError) {
      setError('savingPaymentAmount', { type: 'manual', message: savingAmountValidationError });
      toast.error(savingAmountValidationError);
      return;
    }

    const valid = await trigger(stepFields[step] ?? []);

    if (!valid) {
      toast.error('Please fix validation errors before continuing');
      return;
    }

    setStep((prev) => Math.min(6, prev + 1));
  };

  const onSubmit = async (data: MembershipFormInput) => {
    const selectedBranchObj = branchOptions.find((b) => b.id === data.preferredBranch || b.name === data.preferredBranch);
    const resolvedBranchId = selectedBranchObj?.id || (typeof data.preferredBranch === 'string' && data.preferredBranch.trim() !== '' ? data.preferredBranch : undefined);
    const resolvedBranchName = selectedBranchObj?.name || (typeof data.preferredBranch === 'string' && data.preferredBranch.trim() !== '' ? data.preferredBranch : undefined);

    const payload = {
      firstName: data.firstName,
      fathersName: data.fathersName,
      grandfathersName: data.grandfathersName,
      phone: data.phone,
      email: data.email || undefined,
      idType: data.idType,
      idNumber: data.idNumber,
      branchId: resolvedBranchId,
      preferredBranch: resolvedBranchName,
      membershipPaymentAmount: data.membershipPaymentAmount,
      savingType: data.savingType || undefined,
      savingPaymentAmount: data.savingPaymentAmount,
      savingTransactionRef: data.savingTransactionRef || undefined,
      termsAccepted: data.termsAccepted,
      otpVerificationToken: otpVerificationToken || sessionStorage.getItem('membership_otp_token') || '',
    };

    const response = await fetchWithTimeout(`${baseUrl}/api/membership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeoutMs: 120000,
    });

    const responseText = await response.text();
    let result: MembershipSubmitResponse | { error?: string } = { error: 'Failed to submit membership application' };
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        result = ('success' in parsed && 'data' in parsed) ? parsed.data : parsed;
      } catch {
        result = { error: 'Unexpected response from server' };
      }
    }

    if (!response.ok || !('application' in result)) {
      throw new Error(publicErrorMessages.submitApplication);
    }

    const applicantName = `${data.firstName} ${data.fathersName || ''} ${data.grandfathersName || ''}`.trim();
    const uploads: Array<{ file: File; category: string; label: string }> = [];

    if (uploadedFiles.idFrontName) {
      uploads.push({ file: uploadedFiles.idFrontName, category: data.idType === 'PASSPORT' ? 'PASSPORT' : 'NATIONAL_ID_FRONT', label: 'ID Front' });
    }
    if (uploadedFiles.idBackName && data.idType === 'NATIONAL_ID') {
      uploads.push({ file: uploadedFiles.idBackName, category: 'NATIONAL_ID_BACK', label: 'ID Back' });
    }
    if (uploadedFiles.applicantPhotoName) {
      uploads.push({ file: uploadedFiles.applicantPhotoName, category: 'APPLICANT_PHOTO', label: 'Applicant Photo' });
    }
    if (uploadedFiles.filledFormName) {
      uploads.push({ file: uploadedFiles.filledFormName, category: 'FILLED_FORM', label: 'Filled Form' });
    }
    if (uploadedFiles.membershipPaymentProofName) {
      uploads.push({ file: uploadedFiles.membershipPaymentProofName, category: 'MEMBERSHIP_PAYMENT_PROOF', label: 'Membership Payment Proof' });
    }
    if (uploadedFiles.savingProofName) {
      uploads.push({ file: uploadedFiles.savingProofName, category: 'SAVING_PAYMENT_PROOF', label: 'Saving Payment Proof' });
    }

    const failedUploads: string[] = [];
    for (const upload of uploads) {
      try {
        await uploadMembershipDocument(result.application.id, upload.file, upload.category);
      } catch {
        failedUploads.push(upload.label);
      }
    }

    setSubmittedRef(result.application.referenceNo);
    setSubmittedName(applicantName);
    if (failedUploads.length > 0) {
      toast.warning(`Application submitted, but failed to upload: ${failedUploads.join(', ')}`);
      return;
    }

    if (uploads.length > 0) {
      toast.success(`Application submitted and uploaded: ${uploads.map((upload) => upload.label).join(', ')}`);
      sessionStorage.removeItem('membership_portal_state');
      return;
    }

    toast.success('Membership application submitted successfully');
    sessionStorage.removeItem('membership_portal_state');
  };

  const onInvalidSubmit = (formErrors: FieldErrors<MembershipFormInput>) => {
    for (let i = 1; i <= 5; i += 1) {
      const fields = stepFields[i] ?? [];
      if (fields.some((field) => formErrors[field])) {
        setStep(i);
        break;
      }
    }
    toast.error('Please complete all required fields before submitting');
  };

  const sendOtpCode = async (resend = false) => {
    const validEmail = await trigger(['email']);
    if (!validEmail) {
      toast.error('Enter a valid email address first');
      return;
    }

    setOtpBusy(true);
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/applications/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'membership',
          email: values.email,
          resend,
        }),
        timeoutMs: 30000,
      });

      const payload = (await response.json()) as { error?: string; resendInSeconds?: number, code?: string };
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
      setOtpHint('Code sent. Check your email and verify before it expires.');
      toast.success('Verification code sent to your email');
    } catch (error) {
      console.error('Send membership OTP error:', error);
      setOtpHint(publicErrorMessages.sendOtp);
      toast.error(publicErrorMessages.sendOtp);
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtpCode = async () => {
    const validOtp = await trigger(['email', 'otpCode']);
    if (!validOtp) {
      toast.error('Enter your email and OTP code');
      return;
    }

    setOtpBusy(true);
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/applications/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'membership',
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

      // Save token to browser session memory as a backup safeguard
      sessionStorage.setItem('membership_otp_token', payload.verificationToken);

      setOtpHint('Verification successful. You can continue to the next step.');
      toast.success('Email verified successfully');
    } catch (error) {
      setOtpVerified(false);
      setOtpVerificationToken(null);

      // Clear backup if verification fails
      sessionStorage.removeItem('membership_otp_token');
      console.error('Verify membership OTP error:', error);
      const message = publicErrorMessages.verifyOtp;
      if (String(error).toLowerCase().includes('too many incorrect attempts')) {
        setOtpLockedOut(true);
        setOtpHint('Too many incorrect attempts. Click Resend Code to get a new code.');
      } else {
        setOtpHint(message);
      }
      toast.error(message);
    } finally {
      setOtpBusy(false);
    }
  };

  const submitMembershipApplication = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Submit membership application error:', error);
      toast.error(publicErrorMessages.submitApplication);
    }
  }, onInvalidSubmit);

  const setUploadedFile = (field: MembershipFileField, file: File | null) => {
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

  if (submittedRef) {
    return (
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto max-w-3xl rounded-xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-3 text-3xl font-black text-blue-950">Application Submitted</h1>
          <p className="mb-2 text-slate-700">Applicant: <span className="font-bold">{submittedName || 'Applicant'}</span></p>
          <p className="mb-2 text-slate-700">Reference Number: <span className="font-bold">{submittedRef}</span></p>
          <p className="mb-8 text-sm text-slate-600">
            Expected turnaround is 2-3 business days. Keep this reference number to track your application status.
          </p>
          <Button onClick={() => window.location.assign('/apply')}>Back to Application Guide</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 py-6 md:py-10">
      <div className="container mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 lg:grid-cols-[280px_1fr] lg:gap-6">
        <StepProgress steps={stepTitles} currentStep={step} title="Membership Progress" />

        <form
          id="membership-portal-form"
          onSubmit={(event) => {
            if (step !== 6 || !submitIntentRef.current) {
              event.preventDefault();
              return;
            }

            submitIntentRef.current = false;
            void submitMembershipApplication(event);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || step === 6) {
              return;
            }

            const target = event.target as HTMLElement;
            if (target.tagName !== 'TEXTAREA') {
              event.preventDefault();
            }
          }}
          className="rounded-xl border border-slate-200 bg-white p-5 pb-24 shadow-sm md:p-8 md:pb-8"
        >
          <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-black text-blue-950">Membership Application Portal</h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">Step {step} of 6</p>
          </div>

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email" error={errorText('email')}>
                <Input type="email" placeholder="you@example.com" {...register('email')} />
              </Field>
              <Field label="OTP Code" error={errorText('otpCode')}>
                <Input placeholder="000000" maxLength={8} {...register('otpCode')} />
              </Field>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void sendOtpCode(false)} disabled={otpBusy || resendInSeconds > 0}>
                  {otpBusy ? 'Please wait...' : 'Send Code'}
                </Button>
                <Button type="button" variant="outline" onClick={() => void sendOtpCode(true)} disabled={otpBusy || resendInSeconds > 0}>
                  Resend Code {resendInSeconds > 0 ? `(${resendInSeconds}s)` : ''}
                </Button>
                <Button type="button" variant="outline" onClick={() => void verifyOtpCode()} disabled={otpBusy || !otpSent || otpLockedOut || otpExpiresInSeconds <= 0}>
                  Verify OTP
                </Button>
                <span className={`text-sm font-semibold ${otpVerified ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {otpVerified ? 'Verified' : 'Not verified'}
                </span>
              </div>
              {otpSent && otpExpiresInSeconds > 0 && (
                <p className="md:col-span-2 text-xs font-semibold text-slate-600">
                  Code expires in {formatSeconds(otpExpiresInSeconds)}
                </p>
              )}
              {otpHint && (
                <p className={`md:col-span-2 text-xs font-semibold ${otpLockedOut ? 'text-amber-700' : 'text-slate-600'}`}>
                  {otpHint}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mobile Number" error={errorText('phone')}>
                <Input placeholder="09XXXXXXXX" {...register('phone')} />
              </Field>
              <Field label="First Name" error={errorText('firstName')}>
                <Input {...register('firstName')} />
              </Field>
              <Field label="Father's Name" error={errorText('fathersName')}>
                <Input {...register('fathersName')} />
              </Field>
              <Field label="Grandfather's Name" error={errorText('grandfathersName')}>
                <Input {...register('grandfathersName')} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ID Type" error={errorText('idType')}>
                <select className="h-11 w-full rounded-md border px-3" {...register('idType')}>
                  <option value="NATIONAL_ID">National ID</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="STUDENT_ID">Student ID</option>
                  <option value="KEBELE_ID">Kebele ID</option>
                </select>
              </Field>
              <Field label="ID Number" error={errorText('idNumber')}>
                <Input {...register('idNumber')} />
              </Field>

              <FileInput
                label="ID Front"
                required
                error={errorText('idFrontName')}
                value={getValues('idFrontName')}
                onPick={(file) => setUploadedFile('idFrontName', file)}
              />
              {requiresIdBack && (
                <FileInput
                  label="ID Back (Optional)"
                  error={errorText('idBackName')}
                  value={getValues('idBackName')}
                  onPick={(file) => setUploadedFile('idBackName', file)}
                />
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <FileInput
                label="Applicant Photo"
                required
                error={errorText('applicantPhotoName')}
                value={getValues('applicantPhotoName')}
                onPick={(file) => setUploadedFile('applicantPhotoName', file)}
              />
              <FileInput
                label="Upload Filled Form Document"
                error={errorText('filledFormName')}
                value={getValues('filledFormName')}
                onPick={(file) => setUploadedFile('filledFormName', file)}
              />
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Membership Payment Amount" error={errorText('membershipPaymentAmount')}>
                <Input type="number" step="0.01" {...register('membershipPaymentAmount')} />
              </Field>
              <FileInput
                label="Upload Payment Proof (Membership)"
                error={errorText('membershipPaymentProofName')}
                value={getValues('membershipPaymentProofName')}
                onPick={(file) => setUploadedFile('membershipPaymentProofName', file)}
              />

              <Field label="Saving Type" error={errorText('savingType')}>
                <select className="h-11 w-full rounded-md border px-3" {...register('savingType')}>
                  <option value="">Select saving type</option>
                  {savingTypes.map(st => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Saving Payment Amount" error={errorText('savingPaymentAmount')}>
                <Input
                  type="number"
                  step="0.01"
                  className={errorText('savingPaymentAmount') ? 'border-red-500 text-red-900 focus:ring-red-500 font-semibold' : ''}
                  {...register('savingPaymentAmount')}
                />
                {errorText('savingPaymentAmount') ? (
                  <p className="mt-1.5 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-1.5">
                    <span className="font-extrabold text-sm">⚠</span> {errorText('savingPaymentAmount')}
                  </p>
                ) : (
                  (() => {
                    const selectedType = savingTypes.find((st) => st.name === watch('savingType') || st.id === watch('savingType'));
                    if (!selectedType || (selectedType.minAmount == null && selectedType.maxAmount == null)) return null;
                    return (
                      <p className="mt-1 text-xs font-medium text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                        {selectedType.minAmount != null && `Minimum required contribution: ${selectedType.minAmount.toLocaleString()} ETB. `}
                        {selectedType.maxAmount != null && `Maximum limit: ${selectedType.maxAmount.toLocaleString()} ETB.`}
                      </p>
                    );
                  })()
                )}
              </Field>
              <Field label="Transaction / Reference Number" error={errorText('savingTransactionRef')}>
                <Input {...register('savingTransactionRef')} />
              </Field>
              <FileInput
                label="Upload Saving Payment Proof"
                error={errorText('savingProofName')}
                value={getValues('savingProofName')}
                onPick={(file) => setUploadedFile('savingProofName', file)}
              />

              <Field label="Preferred Branch" error={errorText('preferredBranch')}>
                <select className="h-11 w-full rounded-md border px-3" {...register('preferredBranch')}>
                  <option value="" disabled>Select preferred branch</option>
                  {branchOptions.map((branch) => (
                    <option key={`${branch.id || 'fallback'}-${branch.name}`} value={branch.name}>{branch.name}</option>
                  ))}
                </select>
              </Field>

              <div className="md:col-span-2 space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={watch('termsAccepted')}
                    onCheckedChange={(checked) => setValue('termsAccepted', checked === true, { shouldValidate: true })}
                    id="termsAccepted"
                  />
                  <Label htmlFor="termsAccepted">{tPublicUi('iAgreeToTermsConditions', 'I agree to Terms and Conditions')}</Label>
                </div>
                {errorText('termsAccepted') && <p className="text-xs text-red-600">{errorText('termsAccepted')}</p>}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-blue-950">Review Your Application</h2>
              <div className="rounded-md border border-slate-200">
                {reviewRows.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-1 border-b border-slate-100 p-3 text-sm md:grid-cols-[220px_1fr]">
                    <p className="font-semibold text-slate-600">{label}</p>
                    <p className="text-slate-900">{value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 hidden items-center justify-between border-t border-slate-100 pt-5 md:flex">
            <Button type="button" variant="outline" disabled={step === 1 || isSubmitting} onClick={() => setStep((prev) => prev - 1)}>
              Previous
            </Button>

            {step < 6 ? (
              <Button type="button" onClick={onNext}>Next</Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => {
                  submitIntentRef.current = true;
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-[108px]"
              disabled={isSubmitting}
              onClick={() => setStep((prev) => prev - 1)}
            >
              Previous
            </Button>
          )}

          {step < 6 ? (
            <Button type="button" className="h-11 flex-1" disabled={isSubmitting} onClick={onNext}>
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              form="membership-portal-form"
              className="h-11 flex-1"
              disabled={isSubmitting}
              onClick={() => {
                submitIntentRef.current = true;
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FileInput({
  label,
  required,
  value,
  onPick,
  error,
}: {
  label: string;
  required?: boolean;
  value?: string;
  onPick: (file: File | null) => void;
  error?: string;
}) {
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
      <Label className="text-xs font-semibold text-slate-600">
        {label} {required ? '*' : ''} <span className="font-normal text-slate-500">(Max 5MB)</span>
      </Label>
      <Input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf"
        onChange={handleFileChange}
        className={fileSizeError ? 'border-red-300 focus:ring-red-200' : ''}
      />
      {value && <p className="text-xs text-emerald-700">✓ Selected: {value}</p>}
      {fileSizeError && <p className="text-xs text-red-600">{fileSizeError}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
