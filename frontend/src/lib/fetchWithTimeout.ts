type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number;
};

export async function fetchWithTimeout(input: string, init: FetchWithTimeoutInit = {}): Promise<Response> {
  const { timeoutMs = 30000, ...requestInit } = init;

  if (timeoutMs <= 0 || typeof AbortController === 'undefined') {
    return fetch(input, requestInit);
  }

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timer);
  }
}