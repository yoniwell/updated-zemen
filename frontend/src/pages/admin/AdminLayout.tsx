import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Outlet, useLocation } from 'react-router-dom';
import AdminLayoutWrapper from '@/components/admin/AdminLayoutWrapper';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';
import AdminGuidedTour from '@/components/admin/AdminGuidedTour';
import { clearAdminSession, getAdminUser } from '@/lib/adminAuth';
import { adminFetch } from '@/lib/adminApi';
import { isAdminRole } from '@/lib/adminRbac';
import {
  initializeAccessibilityPreferences,
  setContrastMode,
  setMotionMode,
  type ContrastMode,
  type MotionMode,
} from '@/lib/accessibility';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => getAdminUser(), []);
  
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [contrastMode, setContrastModeState] = useState<ContrastMode>('default');
  const [motionMode, setMotionModeState] = useState<MotionMode>('default');

  useEffect(() => {
    const preference = initializeAccessibilityPreferences();
    setContrastModeState(preference.contrast);
    setMotionModeState(preference.motion);
  }, []);



  useEffect(() => {
    const shouldIgnore = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const handler = (event: KeyboardEvent) => {
      if (shouldIgnore(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const withCtrl = event.ctrlKey || event.metaKey;

      if (withCtrl && key === 'k') {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
        return;
      }

      if (event.shiftKey && key === 'r') {
        event.preventDefault();
        window.location.reload();
        return;
      }

      if (!event.ctrlKey && !event.metaKey && key === 'g') {
        const nextKey = (nextEvent: KeyboardEvent) => {
          const pathMap: Record<string, string> = {
            d: '/admin/dashboard',
            m: '/admin/membership-queue',
            l: '/admin/loan-queue',
            a: '/admin/audit-log',
            u: '/admin/users',
            s: '/admin/settings',
          };

          const targetPath = pathMap[nextEvent.key.toLowerCase()];
          if (targetPath) {
            nextEvent.preventDefault();
            navigate(targetPath);
          }

          window.removeEventListener('keydown', nextKey);
        };

        window.addEventListener('keydown', nextKey, { once: true });
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const onLogout = () => {
    adminFetch('/api/auth/logout', {
      method: 'POST',
    }).finally(() => {
      clearAdminSession();
      navigate('/admin/login');
    });
  };

  return (
    <>
      <AdminLayoutWrapper
        user={user}
        contrastMode={contrastMode}
        motionMode={motionMode}
        onToggleContrast={() => {
          const next = contrastMode === 'high' ? 'default' : 'high';
          setContrastModeState(setContrastMode(next));
        }}
        onToggleMotion={() => {
          const next = motionMode === 'reduced' ? 'default' : 'reduced';
          setMotionModeState(setMotionMode(next));
        }}
        onLogout={onLogout}
      >
        <Outlet />
      </AdminLayoutWrapper>
      
      <AdminCommandPalette open={isPaletteOpen} onOpenChange={setIsPaletteOpen} />
      <AdminGuidedTour role={user?.role} />
    </>
  );
}
