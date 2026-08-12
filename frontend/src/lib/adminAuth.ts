const TOKEN_KEY = 'zemen_admin_token';
const USER_KEY = 'zemen_admin_user';

export interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminSession(token: string, user: AdminUserSession): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAdminUser(): AdminUserSession | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminUserSession;
  } catch {
    return null;
  }
}
