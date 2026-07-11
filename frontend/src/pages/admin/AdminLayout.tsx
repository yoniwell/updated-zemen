import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Outlet, useLocation } from 'react-router-dom';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';
import AdminGuidedTour from '@/components/admin/AdminGuidedTour';
import { clearAdminSession, getAdminUser } from '@/lib/adminAuth';
import { adminFetch } from '@/lib/adminApi';
import { setRoleAccessOverrides, isAdminRole, type AdminModule, type AdminRole } from '@/lib/adminRbac';
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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [contrastMode, setContrastModeState] = useState<ContrastMode>('default');
  const [motionMode, setMotionModeState] = useState<MotionMode>('default');

  useEffect(() => {
    const preference = initializeAccessibilityPreferences();
    setContrastModeState(preference.contrast);
    setMotionModeState(preference.motion);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobileViewport = window.innerWidth < 1024;
      setIsMobile(mobileViewport);
      setIsSidebarVisible((current) => (mobileViewport ? false : current));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarVisible(false);
    }
  }, [isMobile, location.pathname]);

  useEffect(() => {
    let mounted = true;

    const loadRoleAccess = async () => {
      try {
        const response = await adminFetch<{
          roles: Array<{ role: string; modules: string[] }>;
        }>('/api/admin/settings/access-control');

        if (!mounted) {
          return;
        }

        const overrides: Partial<Record<AdminRole, AdminModule[]>> = {};
        for (const roleEntry of response.roles) {
          if (!isAdminRole(roleEntry.role)) {
            continue;
          }

          overrides[roleEntry.role] = roleEntry.modules.filter((module): module is AdminModule =>
            [
              'dashboard',
              'membership',
              'members-list',
              'loan',
              'loans-list',
              'document-review',
              'audit-log',
              'cms',
              'user-management',
              'settings',
            ].includes(module)
          );
        }

        setRoleAccessOverrides(overrides);
      } catch {
        // Keep static local RBAC fallback when backend mapping is unavailable.
      }
    };

    void loadRoleAccess();

    return () => {
      mounted = false;
    };
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
    <div className="admin-color-scope min-h-screen bg-gradient-to-br from-white via-blue-50/40 to-slate-100 pt-[5.25rem] font-serif [font-variant-numeric:slashed-zero] md:pt-[5.5rem]">
      <AdminHeader
        adminName={user?.name || 'Unknown Admin'}
        roleName={user?.role || 'Unknown'}
        branchName={user?.branch?.name || 'Unknown Branch'}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={() => setIsSidebarVisible((visible) => !visible)}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
        onToggleContrast={() => {
          const next = contrastMode === 'high' ? 'default' : 'high';
          setContrastModeState(setContrastMode(next));
        }}
        onToggleMotion={() => {
          const next = motionMode === 'reduced' ? 'default' : 'reduced';
          setMotionModeState(setMotionMode(next));
        }}
        contrastMode={contrastMode}
        motionMode={motionMode}
      />

      {isMobile && isSidebarVisible ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation menu">
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => setIsSidebarVisible(false)}
          />
          <div className="relative h-full p-2 sm:p-3">
            <AdminSidebar onLogout={onLogout} mobile />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1700px] items-start gap-3 px-2 pb-3 pt-3 sm:px-3 md:gap-4 md:px-5 md:pb-4 md:pt-4">
        {!isMobile && isSidebarVisible ? (
          <>
            <div className="w-64 shrink-0" aria-hidden="true" />
            <AdminSidebar onLogout={onLogout} />
          </>
        ) : null}
        <main id="admin-main-content" className="flex-1 p-3 md:p-6">
          <Outlet />
        </main>
      </div>

      <AdminCommandPalette open={isPaletteOpen} onOpenChange={setIsPaletteOpen} />
      <AdminGuidedTour role={user?.role} />
    </div>
  );
}
