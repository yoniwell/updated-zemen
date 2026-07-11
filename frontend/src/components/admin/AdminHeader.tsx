import AvatarInitials from './AvatarInitials';
import type { ContrastMode, MotionMode } from '@/lib/accessibility';
import { useAdminI18n } from '@/lib/uiI18n';
import { Bell, Keyboard, MapPin, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
interface AdminHeaderProps {
  adminName: string;
  roleName: string;
  branchName: string;
  isSidebarVisible?: boolean;
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleContrast?: () => void;
  onToggleMotion?: () => void;
  contrastMode?: ContrastMode;
  motionMode?: MotionMode;
}

export default function AdminHeader({
  adminName,
  roleName,
  branchName,
  isSidebarVisible = true,
  onToggleSidebar,
  onOpenCommandPalette,
  onToggleContrast,
  onToggleMotion,
  contrastMode = 'default',
  motionMode = 'default',
}: AdminHeaderProps) {
  const { tAdmin } = useAdminI18n();

  return (
    <header className="fixed inset-x-0 top-0 z-[60]  bg-white font-serif">
      <div className="mx-auto flex h-16 w-full max-w-[1700px] items-center justify-between gap-4 px-4 md:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
            aria-label={isSidebarVisible ? tAdmin('hideSidebar', 'Hide sidebar') : tAdmin('showSidebar', 'Show sidebar')}
            title={isSidebarVisible ? tAdmin('hideSidebar', 'Hide sidebar') : tAdmin('showSidebar', 'Show sidebar')}
          >
            {isSidebarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          <div>
            <p className="text-sm font-black tracking-widest text-blue-950">ZEMEN SACCO</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{tAdmin('adminPortal', 'Admin Portal')}</p>
          </div>
        </div>

        <div className="hidden flex-1 items-center gap-2 rounded-lg bg-blue-50/40 px-3 py-2 md:flex md:max-w-md">
          <Search className="h-4 w-4 text-blue-500" />
          <input
            className="w-full border-none bg-transparent text-sm outline-none"
            placeholder={tAdmin('searchApplications', 'Search applications, names...')}
            aria-label={tAdmin('searchApplications', 'Search applications, names...')}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-800 transition-colors hover:bg-blue-100 md:block"
            aria-label={tAdmin('openCommandPalette', 'Open command palette')}
            title={`${tAdmin('openCommandPalette', 'Open command palette')} (Ctrl/Cmd + K)`}
          >
            <span className="inline-flex items-center gap-1"><Keyboard className="h-3 w-3" /> {tAdmin('command', 'Command')}</span>
          </button>
          <button
            type="button"
            onClick={onToggleContrast}
            className="hidden rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 md:block"
            aria-label={tAdmin('toggleHighContrast', 'Toggle high contrast mode')}
            title={tAdmin('toggleHighContrast', 'Toggle high contrast mode')}
          >
            {tAdmin('contrast', 'Contrast')}: {contrastMode === 'high' ? tAdmin('high', 'High') : tAdmin('default', 'Default')}
          </button>
          <button
            type="button"
            onClick={onToggleMotion}
            className="hidden rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100 md:block"
            aria-label={tAdmin('toggleReducedMotion', 'Toggle reduced motion')}
            title={tAdmin('toggleReducedMotion', 'Toggle reduced motion')}
          >
            {tAdmin('motion', 'Motion')}: {motionMode === 'reduced' ? tAdmin('reduced', 'Reduced') : tAdmin('default', 'Default')}
          </button>
          <p className="hidden rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 md:block">{tAdmin('branch', 'Branch')}: {branchName}</p>
          <Bell className="h-4 w-4 text-blue-700" />
          <MapPin className="h-4 w-4 text-blue-700" />
          <div className="flex items-center gap-2">
            <AvatarInitials name={adminName} />
            <div className="hidden md:block">
              <p className="text-xs font-bold text-slate-800">{adminName}</p>
              <p className="text-[10px] uppercase text-slate-500">{roleName}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
