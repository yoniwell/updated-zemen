type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class InMemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1000, ttlMs),
    });
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

export const cache = new InMemoryCache();

export const cacheKey = (namespace: string, parts: Array<string | number | boolean | null | undefined>): string => {
  const normalized = parts.map((part) => String(part ?? '')).join('|');
  return `${namespace}:${normalized}`;
};
