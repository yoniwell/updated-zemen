import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getAdminUser } from '@/lib/adminAuth';
import { canAccessModule, type AdminModule } from '@/lib/adminRbac';
import { useAdminI18n } from '@/lib/uiI18n';
import { 
  ClipboardList, FileText, HandCoins, LayoutDashboard, 
  Settings, SquarePen, UserCheck, Users, Menu, LogOut, ChevronDown, ChevronRight
} from 'lucide-react';

const links = [
  { to: '/admin', key: 'dashboard', fallback: 'Dashboard', icon: LayoutDashboard, end: true, module: 'dashboard' },
  { to: '/admin/membership-queue', key: 'membershipQueue', fallback: 'Membership Queue', icon: Users, module: 'membership' },
  { to: '/admin/members-list', key: 'membersList', fallback: 'Members List', icon: UserCheck, module: 'members-list' },
  { to: '/admin/loan-queue', key: 'loanQueue', fallback: 'Loan Queue', icon: FileText, module: 'loan' },
  { to: '/admin/loans-list', key: 'approvedLoans', fallback: 'Approved Loans', icon: HandCoins, module: 'loans-list' },
  { to: '/admin/audit-log', key: 'auditLog', fallback: 'Audit Log', icon: ClipboardList, module: 'audit-log' },
  {
    to: '/admin/cms',
    key: 'content',
    fallback: 'Content',
    icon: SquarePen,
    module: 'cms',
    subLinks: [
      { to: '/admin/cms/services',      key: 'services',      fallback: 'Services' },
      { to: '/admin/cms/savings',       key: 'savings',       fallback: 'Savings' },
      { to: '/admin/cms/loan-products', key: 'loanProducts',  fallback: 'Loan Products' },
      { to: '/admin/cms/news',          key: 'news',          fallback: 'News' },
      { to: '/admin/cms/downloads',     key: 'downloads',     fallback: 'Downloads' },
      { to: '/admin/cms/faqs',          key: 'faqs',          fallback: 'FAQs' },
    ]
  },
  { 
    to: '/admin/settings', 
    key: 'settings', 
    fallback: 'Settings', 
    icon: Settings, 
    module: 'settings',
    subLinks: [
      { to: '/admin/settings/user-management', key: 'userManagement', fallback: 'User Management' },
      { to: '/admin/settings/branches', key: 'branches', fallback: 'Branches' },
      { to: '/admin/settings/saving-types', key: 'savingTypes', fallback: 'Saving Types' },
      { to: '/admin/settings/loan-types', key: 'loanTypes', fallback: 'Loan Types' },
    ]
  },
];

interface AdminSidebarProps {
  onLogout?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function AdminSidebar({ onLogout, isMobileOpen, setIsMobileOpen }: AdminSidebarProps) {
  const { tAdmin } = useAdminI18n();
  const location = useLocation();
  const currentUser = getAdminUser();
  const visibleLinks = links.filter((link) => canAccessModule(currentUser, link.module as AdminModule));

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-expand if current path is under a module with sublinks
    const initial: Record<string, boolean> = {};
    links.forEach(l => {
      if (l.subLinks && location.pathname.startsWith(l.to)) {
        initial[l.key] = true;
      }
    });
    return initial;
  });

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}
      
      <div className={`bg-slate-900 text-white transition-all duration-300 flex flex-col h-screen fixed md:relative z-50 w-64 ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <span className="font-bold text-lg text-blue-400 truncate tracking-wide">ZEMEN ADMIN</span>
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="md:hidden text-slate-300 hover:text-white p-1 rounded hover:bg-white/10 mx-auto"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          {visibleLinks.map((link) => {
            const hasSubLinks = !!link.subLinks;
            const isExpanded = expanded[link.key];
            const isParentActive = location.pathname.startsWith(link.to);

            return (
              <div key={link.to}>
                {hasSubLinks ? (
                  <button
                    onClick={() => toggleExpand(link.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10 ${
                      isParentActive && !isExpanded ? "bg-white/5 text-blue-400 border-r-4 border-blue-400" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="w-5 h-5 shrink-0" />
                      <span>{tAdmin(link.key, link.fallback)}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10 ${
                        isActive ? "bg-white/10 text-blue-400 border-r-4 border-blue-400" : "text-slate-300"
                      }`
                    }
                  >
                    <link.icon className="w-5 h-5 shrink-0" />
                    <span>{tAdmin(link.key, link.fallback)}</span>
                  </NavLink>
                )}

                {/* SubLinks */}
                {hasSubLinks && isExpanded && (
                  <div className="bg-slate-900/50">
                    {link.subLinks.map(sub => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={({ isActive }) => 
                          `block px-4 py-2.5 pl-12 text-sm font-medium transition-colors hover:bg-white/5 ${
                            isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
                          }`
                        }
                      >
                        {tAdmin(sub.key, sub.fallback)}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-500/20 text-red-400 hover:text-red-300 w-full rounded-lg"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>{tAdmin('logout', 'Log Out')}</span>
          </button>
        </div>
      </div>
    </>
  );
}
