/**
 * Real HTTP client for the EcoSphere backend.
 * - Base URL from VITE_API_URL (falls back to the local dev backend).
 * - Unwraps the standard envelope {success, data, error, meta}.
 * - Access token kept in memory; refresh token in localStorage.
 * - On 401, transparently refreshes once via /auth/refresh and retries.
 */

const API_BASE: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ??
  'http://localhost:4000/api/v1';

const REFRESH_KEY = 'ecosphere_refresh';

let accessToken: string | null = null;

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;
  /** Field-level errors mapped from error.details when it is a validation map. */
  fieldErrors: Record<string, string>;

  constructor(status: number, error: ApiErrorShape) {
    super(error.message || 'Request failed');
    this.name = 'ApiError';
    this.code = error.code || 'ERROR';
    this.details = error.details;
    this.status = status;
    this.fieldErrors = extractFieldErrors(error.details);
  }
}

function extractFieldErrors(details: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  // class-validator style: array of "field must be ..." strings
  if (Array.isArray(details)) {
    for (const msg of details) {
      if (typeof msg === 'string') {
        const field = msg.split(' ')[0];
        if (field) out[field] = msg;
      }
    }
  } else if (details && typeof details === 'object') {
    for (const [k, v] of Object.entries(details as Record<string, unknown>)) {
      out[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }
  return out;
}

// ─────────────── token management ───────────────
export const tokens = {
  setAccess(token: string | null): void {
    accessToken = token;
  },
  getAccess(): string | null {
    return accessToken;
  },
  setRefresh(token: string | null): void {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setPair(access: string | null, refresh: string | null): void {
    this.setAccess(access);
    this.setRefresh(refresh);
  },
  clear(): void {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
  hasSession(): boolean {
    return !!accessToken || !!this.getRefresh();
  },
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  isForm?: boolean;
  _retried?: boolean;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokens.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      tokens.clear();
      return false;
    }
    tokens.setPair(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    tokens.clear();
    return false;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, isForm = false } = opts;
  const headers: Record<string, string> = {};
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → refresh once, then retry
  if (res.status === 401 && auth && !opts._retried && path !== '/auth/refresh') {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, { ...opts, _retried: true });
  }

  // binary responses (file downloads) — return the blob
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new ApiError(res.status, { code: 'ERROR', message: res.statusText });
    return (await res.blob()) as unknown as T;
  }

  const json = await res.json();
  if (!res.ok || json?.success === false) {
    const err = json?.error ?? { code: 'ERROR', message: res.statusText };
    throw new ApiError(res.status, err);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  getPublic: <T>(path: string) => request<T>(path, { method: 'GET', auth: false }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postPublic: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body, auth: false }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form, isForm: true }),
  base: API_BASE,
};
