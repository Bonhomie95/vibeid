import { storage } from './storage';
import type {
  AnalyzeResponse,
  ApiError,
  ArchetypeMeta,
  AuthResponse,
  ClashResponse,
  DistributionEntry,
  FriendUser,
  SafeUser,
  VibeResultJSON,
} from './types';

const TOKEN_KEY = 'vibeid:token';

let baseUrl = 'http://192.168.100.54:4000';

export function configureApi(url: string) {
  baseUrl = url.replace(/\/$/, '');
}

export function getBaseUrl() {
  return baseUrl;
}

class ApiException extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function getToken(): Promise<string | null> {
  return storage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await storage.setItem(TOKEN_KEY, token);
  else await storage.removeItem(TOKEN_KEY);
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
  body?: unknown;
  auth?: boolean;
  noToken?: boolean;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!opts.noToken) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const err = (json as ApiError) || { error: 'http_error', message: `HTTP ${res.status}` };
    throw new ApiException(res.status, err.error || 'error', err.message || `HTTP ${res.status}`);
  }
  return json as T;
}

// ----- Auth -----
export const authApi = {
  async signup(email: string, username: string, password: string): Promise<AuthResponse> {
    const r = await request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: { email, username, password },
      noToken: true,
    });
    await setToken(r.token);
    return r;
  },
  async login(email: string, password: string): Promise<AuthResponse> {
    const r = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      noToken: true,
    });
    await setToken(r.token);
    return r;
  },
  async me(): Promise<{ user: SafeUser }> {
    return request<{ user: SafeUser }>('/api/auth/me');
  },
  async logout(): Promise<void> {
    await setToken(null);
  },
  async hasToken(): Promise<boolean> {
    return !!(await getToken());
  },
};

// ----- Archetypes -----
// Note: there is intentionally no list-all endpoint. The catalog is
// hidden — users discover archetypes through their reading and through
// their friends, not as a browsable menu.
export const archetypeApi = {
  get(id: string): Promise<{ archetype: ArchetypeMeta }> {
    return request(`/api/archetypes/${id}`);
  },
  distribution(): Promise<{ totalUsers: number; distribution: DistributionEntry[] }> {
    return request('/api/archetypes/distribution');
  },
};

// ----- Vibe -----
export const vibeApi = {
  /**
   * Analyze a selfie. By default this returns the user's locked-in
   * archetype (if logged in, or if person matching kicked in). Pass
   * `force: true` to skip the lock and run a fresh classification —
   * useful for the "Re-read my vibe" flow on profile.
   */
  async analyze(imageBase64: string, opts: { mimeType?: string; force?: boolean } = {}): Promise<AnalyzeResponse> {
    return request<AnalyzeResponse>('/api/vibe/analyze', {
      method: 'POST',
      body: { imageBase64, mimeType: opts.mimeType, force: opts.force },
    });
  },
  history(): Promise<{ results: VibeResultJSON[] }> {
    return request('/api/vibe/history');
  },
  result(id: string): Promise<AnalyzeResponse> {
    return request(`/api/vibe/result/${id}`);
  },
};

// ----- Friends -----
export const friendsApi = {
  add(username: string): Promise<{ ok: boolean; friend: SafeUser }> {
    return request('/api/friends/add', { method: 'POST', body: { username } });
  },
  list(): Promise<{ friends: FriendUser[] }> {
    return request('/api/friends');
  },
  vibe(username: string): Promise<{ user: SafeUser; latestResult: VibeResultJSON | null; archetype: ArchetypeMeta | null }> {
    return request(`/api/friends/${username}/vibe`);
  },
  clash(otherUsername: string): Promise<ClashResponse> {
    return request(`/api/friends/clash?with=${encodeURIComponent(otherUsername)}`);
  },
};

export { ApiException };
