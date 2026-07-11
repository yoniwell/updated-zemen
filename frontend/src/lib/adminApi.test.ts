import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminFetch, AdminApiError, __resetAdminApiCacheForTests } from './adminApi';

describe('adminFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    __resetAdminApiCacheForTests();
    document.cookie = 'zemen_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('sends queue request with credentials include', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ applications: [] }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await adminFetch<{ applications: unknown[] }>('/api/admin/queues/loan?page=1&limit=10');

    expect(response.applications).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/admin/queues/loan?page=1&limit=10',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('adds csrf header for update endpoints when cookie exists', async () => {
    document.cookie = 'zemen_csrf_token=test-csrf-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ application: { id: 'app-1', status: 'UNDER_REVIEW' } }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await adminFetch('/api/admin/applications/membership/app-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'UNDER_REVIEW', expectedUpdatedAt: '2026-03-27T10:00:00.000Z' }),
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Headers;

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token');
  });

  it('fetches csrf token endpoint when cookie is not readable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ csrfToken: 'fetched-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await adminFetch('/api/admin/applications/membership/app-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'UNDER_REVIEW', expectedUpdatedAt: '2026-03-27T10:00:00.000Z' }),
    });

    const [tokenPath, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(tokenPath).toBe('http://localhost:5000/api/auth/csrf-token');
    expect(tokenInit.credentials).toBe('include');

    const [, requestInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const headers = requestInit.headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBe('fetched-csrf-token');
  });

  it('retries once when csrf token is invalid', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ csrfToken: 'initial-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: 'Invalid CSRF token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ csrfToken: 'refreshed-csrf-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ application: { id: 'app-1' } }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await adminFetch('/api/admin/applications/membership/app-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'UNDER_REVIEW', expectedUpdatedAt: '2026-03-27T10:00:00.000Z' }),
    });

    const [, retriedRequestInit] = fetchMock.mock.calls[3] as [string, RequestInit];
    const retriedHeaders = retriedRequestInit.headers as Headers;
    expect(retriedHeaders.get('X-CSRF-Token')).toBe('refreshed-csrf-token');
  });

  it('throws AdminApiError for failed detail request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: 'Application not found' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const expectedError: Partial<AdminApiError> = {
      name: 'AdminApiError',
      message: 'Application not found',
      status: 404,
    };

    await expect(
      adminFetch('/api/admin/applications/membership/missing-id')
    ).rejects.toMatchObject(expectedError);
  });
});
