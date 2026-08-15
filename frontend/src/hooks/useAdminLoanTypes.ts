import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';

export type AdminLoanType = {
  id: string;
  name: string;
  category?: string | null;
  description?: string;
  isActive: boolean;
  minAmount?: number | null;
  maxAmount?: number | null;
  minTenure?: number | null;
  maxTenure?: number | null;
};

const normalize = (value: string): string => value.trim().toLowerCase();

export function useAdminLoanTypes() {
  const [loanTypes, setLoanTypes] = useState<AdminLoanType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLoanTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch<{ loanTypes: AdminLoanType[] }>('/api/settings/loan-types?includeInactive=true');
      setLoanTypes(response.loanTypes || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load loan types');
      setLoanTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLoanTypes();
  }, [loadLoanTypes]);

  const loanTypeNames = useMemo(() => {
    const names = new Map<string, string>();

    for (const type of loanTypes) {
      const name = (type.name || '').trim();
      if (!name) continue;
      names.set(normalize(name), name);
    }

    return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
  }, [loanTypes]);

  return {
    loanTypes,
    loanTypeNames,
    loading,
    error,
    reload: loadLoanTypes,
  };
}
