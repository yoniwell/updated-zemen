import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminApi';

export type AdminSavingType = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
};

const normalize = (value: string): string => value.trim().toLowerCase();

export function useAdminSavingTypes() {
  const [savingTypes, setSavingTypes] = useState<AdminSavingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSavingTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch<{ savingTypes: AdminSavingType[] }>('/api/settings/saving-types?includeInactive=true');
      setSavingTypes(response.savingTypes || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load saving types');
      setSavingTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSavingTypes();
  }, [loadSavingTypes]);

  const savingTypeNames = useMemo(() => {
    const names = new Map<string, string>();

    for (const type of savingTypes) {
      const name = (type.name || '').trim();
      if (!name) continue;
      names.set(normalize(name), name);
    }

    return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
  }, [savingTypes]);

  return {
    savingTypes,
    savingTypeNames,
    loading,
    error,
    reload: loadSavingTypes,
  };
}
