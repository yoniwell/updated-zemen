import { useState, useEffect, useCallback } from 'react';

import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { ROLE_LABELS, type AdminRole } from '@/lib/adminRbac';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '@/pages/admin/UserManagement';
import { useAdminI18n } from '@/lib/uiI18n';
import { ShieldCheck, UserCog } from 'lucide-react';
interface RoleAccess {
  role: AdminRole;
  label: string;
  modules: string[];
  branchRequired: boolean;
}

const moduleOptions = [
  'dashboard',
  'membership',
  'members-list',
  'loan',
  'loans-list',
  'document-review',
  'notifications',
  'audit-log',
  'cms',
  'user-management',
  'settings',
] as const;

export default function SettingsHome() {
  const { tAdmin } = useAdminI18n();
  const [roleAccess, setRoleAccess] = useState<RoleAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRole, setSavingRole] = useState<AdminRole | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accessResponse = await adminFetch<{ roles: RoleAccess[] }>('/api/admin/settings/access-control');
      setRoleAccess(accessResponse.roles);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tAdmin('failedLoadSettings', 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  }, [tAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleRoleModule = (role: AdminRole, module: string) => {
    setRoleAccess((prev) =>
      prev.map((entry) => {
        if (entry.role !== role) return entry;
        const exists = entry.modules.includes(module);
        return {
          ...entry,
          modules: exists ? entry.modules.filter((item) => item !== module) : [...entry.modules, module],
        };
      })
    );
  };

  const saveRoleModules = async (role: AdminRole, modules: string[]) => {
    if (modules.length === 0) {
      toast.error(tAdmin('selectAtLeastOneModule', 'Select at least one module before saving'));
      return;
    }
    setSavingRole(role);
    try {
      await adminFetch<{ role: AdminRole; modules: string[] }>(`/api/admin/settings/access-control/${role}`, {
        method: 'PATCH',
        body: JSON.stringify({ modules }),
      });
      toast.success(tAdmin('rolePermissionsUpdated', '{{role}} permissions updated', { role: ROLE_LABELS[role] }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tAdmin('failedUpdateRoleAccess', 'Failed to update role access'));
      await loadData();
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <h1 className="font-serif text-2xl text-foreground">{tAdmin('settingsHeading', 'Settings')}</h1>
      </div>

      <Tabs defaultValue="access" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="access">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Access Matrix
          </TabsTrigger>
          <TabsTrigger value="user-management">
            <UserCog className="mr-2 h-4 w-4" />
            User Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access">
          {loading ? (
            <p>Loading…</p>
          ) : (
            <div className="grid gap-6">
              {roleAccess.map((entry) => (
                <div key={entry.role} className="mb-4 rounded border p-4">
                  <h3 className="text-lg font-medium">{ROLE_LABELS[entry.role]}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {moduleOptions.map((module) => {
                      const enabled = entry.modules.includes(module);
                      return (
                        <button
                          key={module}
                          type="button"
                          onClick={() => toggleRoleModule(entry.role, module)}
                          className={[
                            'rounded border h-10 px-4 py-2 text-sm font-semibold uppercase tracking-wide',
                            enabled ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500',
                          ].join(' ')}
                        >
                          {module}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <Button size="sm" onClick={() => void saveRoleModules(entry.role, entry.modules)} disabled={savingRole === entry.role}>
                      {savingRole === entry.role ? tAdmin('saving', 'Saving…') : tAdmin('saveRolePermissions', 'Save Role Permissions')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="user-management">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
