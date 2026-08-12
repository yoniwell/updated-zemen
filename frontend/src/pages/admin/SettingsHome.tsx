import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminApi';
import { ROLE_LABELS, type AdminRole } from '@/lib/adminRbac';
import { Button } from '@/components/ui/button';
import { useAdminI18n } from '@/lib/uiI18n';
import { ShieldCheck } from 'lucide-react';

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
      const accessResponse = await adminFetch<{ accessControl: Record<string, RoleAccess> }>('/api/settings/access-control');
      setRoleAccess(Object.values(accessResponse.accessControl || {}));
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
      await adminFetch<{ role: AdminRole; modules: string[] }>(`/api/settings/access-control/${role}`, {
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
    <div className="flex h-full flex-col bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Access Matrix
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Configure which modules each administrative role can access.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading access matrix...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(roleAccess || []).map((entry) => (
              <div key={entry.role} className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <h3 className="text-lg font-bold text-slate-900">{ROLE_LABELS[entry.role]}</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Role Identifier: {entry.role}</p>
                </div>
                <div className="flex-1 p-5">
                  <div className="flex flex-wrap gap-2">
                    {moduleOptions.map((module) => {
                      const enabled = entry.modules.includes(module);
                      return (
                        <button
                          key={module}
                          type="button"
                          onClick={() => toggleRoleModule(entry.role, module)}
                          className={[
                            'rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                            enabled 
                              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                              : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100',
                          ].join(' ')}
                        >
                          {module}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-slate-100 p-4">
                  <Button 
                    size="sm" 
                    className="w-full font-bold"
                    onClick={() => void saveRoleModules(entry.role, entry.modules)} 
                    disabled={savingRole === entry.role}
                  >
                    {savingRole === entry.role ? tAdmin('saving', 'Saving…') : tAdmin('saveRolePermissions', 'Save Permissions')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
