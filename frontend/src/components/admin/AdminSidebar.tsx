import { NavLink } from 'react-router-dom';
import { getAdminUser } from '@/lib/adminAuth';
import { canAccessModule, type AdminModule } from '@/lib/adminRbac';
import { useAdminI18n } from '@/lib/uiI18n';
import { ClipboardList, FileText, HandCoins, LayoutDashboard, LogOut, Settings, SquarePen, UserCheck, Users } from 'lucide-react';

const links = [
  { to: '/admin', key: 'dashboard', fallback: 'Dashboard', icon: LayoutDashboard, end: true, module: 'dashboard' },
  { to: '/admin/membership-queue', key: 'membershipQueue', fallback: 'Membership Queue', icon: Users, module: 'membership' },
  { to: '/admin/members-list', key: 'membersList', fallback: 'Members List', icon: UserCheck, module: 'members-list' },
  { to: '/admin/loan-queue', key: 'loanQueue', fallback: 'Loan Queue', icon: FileText, module: 'loan' },
  { to: '/admin/loans-list', key: 'approvedLoans', fallback: 'Approved Loans', icon: HandCoins, module: 'loans-list' },
  { to: '/admin/audit-log', key: 'auditLog', fallback: 'Audit Log', icon: ClipboardList, module: 'audit-log' },
  { to: '/admin/cms', key: 'cms', fallback: 'CMS', icon: SquarePen, module: 'cms' },

  { to: '/admin/settings', key: 'settings', fallback: 'Settings', icon: Settings, module: 'settings' },
];

interface AdminSidebarProps {
  onLogout?: () => void;
  mobile?: boolean;
}

export default function AdminSidebar({ onLogout, mobile = false }: AdminSidebarProps) {
  const { tAdmin } = useAdminI18n();
  const currentUser = getAdminUser();
  const visibleLinks = links.filter((link) => canAccessModule(currentUser, link.module as AdminModule));

  const layoutClassName = mobile
    ? 'flex h-full w-full max-w-[22rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-3 text-slate-700 font-serif shadow-2xl sm:p-4'
    : 'fixed left-[max(0.75rem,calc((100vw-1700px)/2+0.75rem))] top-[5.25rem] z-30 flex h-[calc(100dvh-6rem)] w-64 min-h-0 flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 text-slate-700 font-serif md:left-[max(1.25rem,calc((100vw-1700px)/2+1.25rem))]';

  const navItemClassName = mobile
    ? 'flex items-center gap-3 rounded-lg border-b border-slate-100 px-3 py-3 text-[13px] font-semibold transition-colors last:border-b-0'
    : 'flex items-center gap-3 rounded-lg border-b border-slate-100 px-3 py-2 text-sm font-semibold transition-colors last:border-b-0';

  const logoutButtonClassName = mobile
    ? 'mt-3 shrink-0 flex h-11 items-center gap-2 rounded-lg bg-red-50 px-3 text-[11px] font-bold uppercase tracking-wider text-red-700 hover:bg-red-100'
    : 'mt-4 shrink-0 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-700 hover:bg-red-100';

  return (
    <aside className={layoutClassName}>
      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              [
                navItemClassName,
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-blue-50/60 hover:text-blue-700',
              ].join(' ')
            }
          >
            <link.icon className="h-4 w-4" />
            {tAdmin(link.key, link.fallback)}
          </NavLink>
        ))}
      </nav>

      <button className={logoutButtonClassName} onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        {tAdmin('logout', 'Log Out')}
      </button>
    </aside>
  );
}
