let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null): void {
  authToken = t;
}

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(path, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, code: 'SERVER_ERROR' }));
    const err = new ApiError(res.status, body.code ?? 'SERVER_ERROR', body.error ?? res.statusText);
    // Auto-logout on INVALID_TOKEN (expired/tampered JWT)
    if (res.status === 401 && body.code === 'INVALID_TOKEN' && onUnauthorized) {
      onUnauthorized();
    }
    throw err;
  }
  return res.json() as Promise<T>;
}
