const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  // In production we default to same-origin so frontend can be hosted without hardcoding localhost.
  if (import.meta.env.PROD) {
    return '';
  }

  return '';
};
