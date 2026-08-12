import { LogOut, UserCircle, Menu, Moon, Sun, MonitorPlay, Activity } from "lucide-react";
import { type AdminUserSession } from "@/lib/adminAuth";
import { type ContrastMode, type MotionMode } from "@/lib/accessibility";

interface AdminHeaderProps {
  user: AdminUserSession | null;
  onMenuClick: () => void;
  onLogout: () => void;
  contrastMode: ContrastMode;
  motionMode: MotionMode;
  onToggleContrast: () => void;
  onToggleMotion: () => void;
}

export default function AdminHeader({ 
  user, 
  onMenuClick, 
  onLogout,
  contrastMode,
  motionMode,
  onToggleContrast,
  onToggleMotion
}: AdminHeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm relative z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-slate-700">
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-semibold text-slate-700 text-sm hidden sm:block">
          Welcome, {user?.name || "Admin"}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        
        {/* Accessibility Toggles (from previous implementation) */}
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4 hidden lg:flex text-slate-500">
          <button
            onClick={onToggleContrast}
            className="hover:bg-slate-100 p-1.5 rounded transition-colors"
            title="Toggle High Contrast"
            aria-label="Toggle High Contrast"
          >
            {contrastMode === 'high' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleMotion}
            className="hover:bg-slate-100 p-1.5 rounded transition-colors"
            title="Toggle Reduced Motion"
            aria-label="Toggle Reduced Motion"
          >
            {motionMode === 'reduced' ? <Activity className="w-4 h-4" /> : <MonitorPlay className="w-4 h-4" />}
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 text-slate-600 border-r border-slate-200 pr-2 md:pr-4">
          <UserCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium hidden sm:inline">{user?.role}</span>
          <span className="text-xs text-slate-400 hidden lg:inline">({user?.branch?.name || "No Branch"})</span>
        </div>
        
        {/* Mobile Logout (Hidden on desktop since it's in sidebar now) */}
        <button 
          onClick={onLogout}
          className="md:hidden flex items-center gap-1.5 text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </header>
  );
}
