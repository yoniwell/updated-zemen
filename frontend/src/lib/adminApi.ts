import { getApiBaseUrl } from './apiBaseUrl';
import { fetchWithTimeout } from './fetchWithTimeout';

const baseUrl = getApiBaseUrl();
let cachedCsrfToken: string | null = null;

const getCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const raw = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  if (!raw) {
    return null;
  }

  return decodeURIComponent(raw.slice(name.length + 1));
};

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

const parseJsonPayload = (responseText: string): Record<string, unknown> => {
  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const fetchCsrfToken = async (): Promise<string | null> => {
  const response = await fetchWithTimeout(`${baseUrl}/api/auth/csrf-token`, {
    method: 'GET',
    credentials: 'include',
  });

  const responseText = await response.text();
  const payload = parseJsonPayload(responseText);
  const csrfToken = typeof payload.csrfToken === 'string' ? payload.csrfToken : null;

  if (response.ok && csrfToken) {
    cachedCsrfToken = csrfToken;
    return csrfToken;
  }

  return null;
};

const resolveCsrfToken = async (): Promise<string | null> => {
  const cookieToken = getCookieValue('zemen_csrf_token');
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }

  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  return fetchCsrfToken();
};

export const __resetAdminApiCacheForTests = (): void => {
  cachedCsrfToken = null;
};

const executeRequest = async (
  path: string,
  init: RequestInit | undefined,
  headers: Headers
): Promise<{ response: Response; payload: Record<string, unknown> }> => {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    ...init,
    headers: Object.fromEntries(headers.entries()),
    credentials: 'include',
  });

  const responseText = await response.text();
  const payload = parseJsonPayload(responseText);
  return { response, payload };
};

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const method = (init?.method || 'GET').toUpperCase();
  const requiresCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const token = localStorage.getItem('zemen_admin_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && init?.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresCsrf && !headers.has('X-CSRF-Token')) {
    const csrfToken = await resolveCsrfToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  let { response, payload } = await executeRequest(path, init, headers);

  if (
    requiresCsrf &&
    response.status === 403 &&
    payload.error === 'Invalid CSRF token'
  ) {
    cachedCsrfToken = null;
    const refreshedToken = await fetchCsrfToken();
    if (refreshedToken) {
      headers.set('X-CSRF-Token', refreshedToken);
      ({ response, payload } = await executeRequest(path, init, headers));
    }
  }

  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : `Request failed (HTTP ${response.status})`;
    throw new AdminApiError(message, response.status);
  }

  // The backend wraps responses in a { success: true, data: ... } envelope using sendResponse.
  // We need to unwrap it so components get the expected type.
  if ('success' in payload && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}
