import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { Checkbox } from '@/components/ui/checkbox';
import { setAdminSession } from '@/lib/adminAuth';
import { useAdminI18n } from '@/lib/uiI18n';
import { Input } from '@/components/ui/input';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
const baseUrl = getApiBaseUrl();

export default function AdminLogin() {
  const t = useAdminI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

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

  return (
    <section className="flex min-h-screen items-center justify-center bg-blue-950 px-4 py-16">
      <div className="w-full max-w-md rounded-lg bg-white p-8">
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
            <button type="button" className="font-semibold text-blue-700 hover:text-blue-900">{t('adminForgotPasswordLabel', 'Forgot password?')}</button>
          </div>

          <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={loading}>
            {loading ? t('adminSigningIn', 'Signing In...') : t('adminLoginButton', 'Login')}
          </Button>

          <p className="pt-3 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {t('adminSecureSessionNotice', 'Secure session protected with institutional access controls')}
          </p>
        </form>
      </div>
    </section>
  );
}
