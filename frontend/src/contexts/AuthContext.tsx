import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setToken } from '../api/client';
import * as authApi from '../api/auth';

interface AuthUser {
  username: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('sc_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('sc_user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  useEffect(() => {
    setToken(token);
  }, [token]);

  function persist(t: string, u: AuthUser) {
    localStorage.setItem('sc_token', t);
    localStorage.setItem('sc_user', JSON.stringify(u));
    setTokenState(t);
    setToken(t);
    setUser(u);
  }

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password);
    persist(res.token, { username: res.username, role: res.role });
  }

  async function signup(username: string, password: string) {
    const res = await authApi.signup(username, password);
    persist(res.token, { username: res.username, role: res.role });
  }

  function logout() {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
    setTokenState(null);
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
