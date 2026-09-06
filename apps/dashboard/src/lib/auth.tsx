'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState | null>(null);

function loadToken(): string | null {
  try {
    return sessionStorage.getItem('nh_access');
  } catch {
    return null;
  }
}

function saveToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem('nh_access', token);
    else sessionStorage.removeItem('nh_access');
  } catch {
    // Storage unavailable (SSR/private mode): session simply won't persist.
  }
}

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken: string; user: SessionUser };
    saveToken(body.accessToken);
    return body.accessToken;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers);
    const token = loadToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    let res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
    if (res.status === 401 && token) {
      const fresh = await tryRefresh();
      if (fresh) {
        const retry = new Headers(headers);
        retry.set('Authorization', `Bearer ${fresh}`);
        res = await fetch(`${API_BASE}${path}`, { ...init, headers: retry, credentials: 'include' });
      }
    }
    return res;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      return body?.code ?? `http_${res.status}`;
    }
    const body = (await res.json()) as { accessToken: string; user: SessionUser };
    saveToken(body.accessToken);
    setUser(body.user);
    setReady(true);
    try {
      const me = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${body.accessToken}` },
        credentials: 'include',
      });
      if (me.ok) setUser(((await me.json()) as SessionUser) ?? body.user);
    } catch {
      // Login already succeeded; profile refresh is best-effort.
    }
    return null;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Logout is best-effort; local session is cleared regardless.
    }
    saveToken(null);
    setUser(null);
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout, apiFetch }),
    [user, ready, login, logout, apiFetch],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
