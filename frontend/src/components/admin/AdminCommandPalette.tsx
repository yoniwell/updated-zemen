import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command';
import { useAdminI18n } from '@/lib/uiI18n';

type CommandEntry = {
  id: string;
  label: string;
  keywords: string;
  shortcut: string;
  run: () => void;
};

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminCommandPalette({ open, onOpenChange }: AdminCommandPaletteProps) {
  const navigate = useNavigate();
  const { tAdmin } = useAdminI18n();
  const [searchValue, setSearchValue] = useState('');

  const routeCommands = useMemo<CommandEntry[]>(
    () => [
      { id: 'dashboard', label: 'Go to Dashboard', keywords: 'dashboard home', shortcut: 'G D', run: () => navigate('/admin/dashboard') },
      { id: 'membership', label: 'Open Membership Queue', keywords: 'membership queue applications', shortcut: 'G M', run: () => navigate('/admin/membership-queue') },
      { id: 'loan', label: 'Open Loan Queue', keywords: 'loan queue applications', shortcut: 'G L', run: () => navigate('/admin/loan-queue') },
      { id: 'users', label: 'Open User Management', keywords: 'users rbac staff', shortcut: 'G U', run: () => navigate('/admin/users') },
      { id: 'audit', label: 'Open Audit Log', keywords: 'audit compliance activity', shortcut: 'G A', run: () => navigate('/admin/audit-log') },
      { id: 'settings', label: 'Open Settings', keywords: 'settings flags config', shortcut: 'G S', run: () => navigate('/admin/settings') },
      { id: 'notifications', label: 'Open Notifications', keywords: 'notifications alerts', shortcut: 'G N', run: () => navigate('/admin/notifications') },
      { id: 'cms', label: 'Open CMS', keywords: 'content news downloads cms', shortcut: 'G C', run: () => navigate('/admin/cms') },
    ],
    [navigate]
  );

  const quickActions = useMemo<CommandEntry[]>(
    () => [
      {
        id: 'refresh-page',
        label: 'Refresh Current Page',
        keywords: 'refresh reload retry',
        shortcut: 'Shift R',
        run: () => window.location.reload(),
      },
      {
        id: 'search-reference',
        label: 'Search by Reference in Membership Queue',
        keywords: 'reference number lookup search',
        shortcut: 'Ref',
        run: () => {
          const ref = searchValue.trim();
          if (!ref) {
            navigate('/admin/membership-queue');
            return;
          }
          navigate(`/admin/membership-queue?search=${encodeURIComponent(ref)}`);
        },
      },
    ],
    [navigate, searchValue]
  );

  const execute = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin('openCommandPalette', 'Open command palette')}
      description={tAdmin('searchApplications', 'Search applications, names...')}
    >
      <CommandInput
        placeholder={tAdmin('searchApplications', 'Search applications, names...')}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>{tAdmin('noMatchingCommand', 'No matching command found.')}</CommandEmpty>
        <CommandGroup heading={tAdmin('navigation', 'Navigation')}>
          {routeCommands.map((command) => (
            <CommandItem key={command.id} value={`${command.label} ${command.keywords}`} onSelect={() => execute(command.run)}>
              {command.label}
              <CommandShortcut>{command.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={tAdmin('actions', 'Actions')}>
          {quickActions.map((action) => (
            <CommandItem key={action.id} value={`${action.label} ${action.keywords}`} onSelect={() => execute(action.run)}>
              {action.label}
              <CommandShortcut>{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
