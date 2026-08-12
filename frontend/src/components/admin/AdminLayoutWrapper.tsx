import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useLocation } from "react-router-dom";
import { getAdminUser, AdminUserSession } from '@/lib/adminAuth';
import {
  type ContrastMode,
  type MotionMode,
} from '@/lib/accessibility';

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  user: AdminUserSession | null;
  contrastMode: ContrastMode;
  motionMode: MotionMode;
  onLogout: () => void;
  onToggleContrast: () => void;
  onToggleMotion: () => void;
}

export default function AdminLayoutWrapper({ 
  children, 
  user,
  contrastMode,
  motionMode,
  onLogout,
  onToggleContrast,
  onToggleMotion
}: AdminLayoutWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false); // Close mobile drawer on navigation
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative admin-color-scope font-sans">
      <AdminSidebar 
        isMobileOpen={isMobileMenuOpen} 
        setIsMobileOpen={setIsMobileMenuOpen}
        onLogout={onLogout} 
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        <AdminHeader 
          user={user} 
          onMenuClick={() => setIsMobileMenuOpen(true)}
          contrastMode={contrastMode}
          motionMode={motionMode}
          onToggleContrast={onToggleContrast}
          onToggleMotion={onToggleMotion}
          onLogout={onLogout}
        />
        {/* Main Content Area (Scrolls independently) */}
        <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
