import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const baseUrl = getApiBaseUrl();

export default function AdminResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Validate token on mount
  useEffect(() => {
    if (!token || !email) {
      setVerifying(false);
      setTokenValid(false);
      setErrorMessage('Missing password reset token or email address in the link.');
      return;
    }

    let isMounted = true;

    const checkToken = async () => {
      try {
        const res = await fetchWithTimeout(`${baseUrl}/api/auth/verify-reset-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
          timeoutMs: 15000,
        });

        const data = await res.json().catch(() => ({}));
        const payload = data?.data || data;

        if (!isMounted) return;

        if (res.ok && (payload?.valid || data?.valid)) {
          setTokenValid(true);
          setUserName(payload?.name || data?.name || '');
        } else {
          setTokenValid(false);
          setErrorMessage(payload?.error || payload?.message || data?.error || data?.message || 'This password reset link is invalid, expired, or has already been used.');
        }
      } catch {
        if (isMounted) {
          setTokenValid(false);
          setErrorMessage('Unable to connect to authentication server. Please check your network.');
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    };

    void checkToken();

    return () => {
      isMounted = false;
    };
  }, [token, email]);

  // Real-time password strength checks
  const checks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
      matches: password.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const allCriteriaMet = checks.minLength && checks.hasNumber && checks.matches;

  // Auto redirect on success
  useEffect(() => {
    if (!resetSuccess) return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/admin/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resetSuccess, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tokenValid || submitting || !allCriteriaMet) return;

    setSubmitting(true);
    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
        timeoutMs: 15000,
      });

      const data = await res.json().catch(() => ({}));
      const payload = data?.data || data;

      if (res.ok && (data?.success || payload?.success || data?.message || payload?.message)) {
        setResetSuccess(true);
        toast.success('Password updated successfully!');
      } else {
        toast.error(payload?.error || payload?.message || data?.error || data?.message || 'Failed to reset password');
      }
    } catch {
      toast.error('Network error during password reset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-slate-100">
        {/* Header Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Zemen SACCO</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Staff Password Setup</h1>
          <p className="mt-1 text-xs text-slate-500">Secure credential management for institutional staff</p>
        </div>

        {/* State 1: Verifying Token */}
        {verifying && (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-600">Verifying secure reset token...</p>
          </div>
        )}

        {/* State 2: Invalid / Expired Token */}
        {!verifying && !tokenValid && (
          <div className="space-y-6">
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
              <h3 className="mt-2 text-base font-bold text-red-900">Reset Link Invalid</h3>
              <p className="mt-1 text-xs text-red-700 leading-relaxed">
                {errorMessage || 'This password reset link is invalid, expired, or has already been used.'}
              </p>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-xs text-slate-500">
                For security reasons, password reset links expire after 30 minutes and can only be used once.
              </p>
              <Link to="/admin/login">
                <Button variant="outline" className="w-full font-bold gap-2">
                  <ArrowLeft className="h-4 w-4" /> Return to Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Reset Form */}
        {!verifying && tokenValid && !resetSuccess && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {userName && (
              <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-3 text-xs text-blue-900">
                Account: <span className="font-bold">{userName}</span> ({email})
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="new-password">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter at least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 h-11"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="confirm-password">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 h-11"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-600" /> Password Requirements:
              </p>
              <ul className="space-y-1 pl-1">
                <li className={`flex items-center gap-2 ${checks.minLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${checks.minLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-2 ${checks.hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${checks.hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                  Contains at least one number (0-9)
                </li>
                <li className={`flex items-center gap-2 ${checks.matches ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${checks.matches ? 'text-emerald-600' : 'text-slate-300'}`} />
                  Passwords match
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={submitting || !allCriteriaMet}
              className="w-full h-11 bg-blue-700 hover:bg-blue-800 font-bold text-sm shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Set New Password'
              )}
            </Button>

            <div className="text-center">
              <Link to="/admin/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-3 w-3" /> Back to Login
              </Link>
            </div>
          </form>
        )}

        {/* State 4: Success Screen */}
        {resetSuccess && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Password Updated!</h3>
              <p className="mt-1 text-xs text-slate-600">
                Your staff password has been securely reset. You can now log in to the admin portal with your new credentials.
              </p>
            </div>
            <p className="text-xs font-semibold text-blue-600">
              Redirecting to login in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </p>
            <Link to="/admin/login">
              <Button className="w-full bg-blue-700 hover:bg-blue-800 font-bold">
                Log In Now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
