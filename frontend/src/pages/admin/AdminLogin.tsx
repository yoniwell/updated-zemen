import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { Checkbox } from '@/components/ui/checkbox';
import { setAdminSession } from '@/lib/adminAuth';
import { useAdminI18n } from '@/lib/uiI18n';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const baseUrl = getApiBaseUrl();

export default function AdminLogin() {
  const t = useAdminI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Forgot Password State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberDevice }),
        credentials: 'include',
      });

      const responseText = await response.text();
      let payload: {
        error?: string | { message: string };
        token?: string;
        user?: {
          id: string;
          name: string;
          email: string;
          role: string;
          branch?: { id: string; name: string; code: string } | null;
        };
        data?: {
          token?: string;
          user?: any;
        };
      } = {};

      try {
        payload = responseText ? JSON.parse(responseText) as typeof payload : {};
      } catch {
        payload = {};
      }

      const token = payload.data?.token || payload.token;
      const user = payload.data?.user || payload.user;

      if (!response.ok || !token || !user) {
        const errorMsg = typeof payload.error === 'string' ? payload.error : payload.error?.message;
        toast.error(errorMsg || `${t('adminLoginFailedPrefix', 'Login failed (HTTP')} ${response.status})`);
        return;
      }

      setAdminSession(token, user);
      toast.success(t('adminLoginSuccess', 'Admin login successful'));
      navigate('/admin');
    } catch {
      toast.error(t('adminServerUnavailableMessage', 'Unable to reach the server. Check backend availability.'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || forgotLoading) return;

    setForgotLoading(true);
    setDevResetUrl(null);

    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
        timeoutMs: 15000,
      });

      const data = await res.json().catch(() => ({}));
      setForgotSubmitted(true);
      if (data?.resetUrl) {
        setDevResetUrl(data.resetUrl);
      }
      toast.success('Password reset instructions dispatched');
    } catch {
      toast.error('Unable to send password reset request. Please check server connectivity.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(email || '');
    setForgotSubmitted(false);
    setDevResetUrl(null);
    setIsForgotOpen(true);
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-blue-950 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">{t('adminLoginBrand', 'Zemen SACCO')}</p>
          <h1 className="mt-2 text-2xl font-black text-blue-950">{t('adminLoginPortalTitle', 'Institutional Admin Portal')}</h1>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="admin-email">{t('email', 'Email')}</label>
            <Input id="admin-email" type="email" placeholder={t('adminLoginEmailPlaceholder', 'admin@zemensacco.com')} value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="admin-password">{t('adminLoginPasswordLabel', 'Password')}</label>
            <Input id="admin-password" type="password" placeholder={t('adminLoginPasswordPlaceholder', 'Enter password')} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-600" htmlFor="remember-device">
              <Checkbox
                id="remember-device"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked === true)}
              />
              {t('adminRememberDeviceLabel', 'Remember this device')}
            </label>
            <button
              type="button"
              onClick={handleOpenForgotModal}
              className="font-semibold text-blue-700 hover:text-blue-900 transition-colors"
            >
              {t('adminForgotPasswordLabel', 'Forgot password?')}
            </button>
          </div>

          <Button type="submit" className="w-full h-11 bg-blue-700 hover:bg-blue-800 font-bold" disabled={loading}>
            {loading ? t('adminSigningIn', 'Signing In...') : t('adminLoginButton', 'Login')}
          </Button>

          <p className="pt-3 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t('adminSecureSessionNotice', 'Secure session protected with institutional access controls')}
          </p>
        </form>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Reset Staff Password
            </DialogTitle>
          </DialogHeader>

          {!forgotSubmitted ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 pt-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered institutional staff email address. We will send you a secure, one-time link to set a new password.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600" htmlFor="forgot-email">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="staff@zemensacco.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="pl-9 h-11"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsForgotOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-700 hover:bg-blue-800 font-semibold" disabled={forgotLoading}>
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 pt-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Reset Request Dispatched</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If an active staff account is registered under <span className="font-semibold text-slate-800">{forgotEmail}</span>, a secure password reset link has been dispatched.
                </p>
              </div>

              {devResetUrl && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-left">
                  <p className="text-[11px] font-bold text-amber-800">Development Mode Reset Link:</p>
                  <a
                    href={devResetUrl}
                    className="text-xs font-semibold text-blue-700 hover:underline break-all block mt-1"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Links remain valid for 30 minutes. Please check your spam folder if not received.
              </p>

              <DialogFooter className="pt-2">
                <Button className="w-full" onClick={() => setIsForgotOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

