import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';

export type AdminBranch = {
  id: string;
  name: string;
  code?: string;
  location?: string;
  manager?: string | null;
  status?: string;
  officeHours?: string | null;
  mapUrl?: string | null;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  published?: boolean;
};

const normalize = (value: string): string => value.trim().toLowerCase();

export function useAdminBranches() {
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch<{ branches: AdminBranch[] }>('/api/settings/branches');
      setBranches(response.branches || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load branches');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const branchNames = useMemo(() => {
    const names = new Map<string, string>();

    for (const branch of branches) {
      const name = (branch.name || '').trim();
      if (!name) continue;
      names.set(normalize(name), name);
    }

    return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
  }, [branches]);

  return {
    branches,
    branchNames,
    loading,
    error,
    reload: loadBranches,
  };
}
