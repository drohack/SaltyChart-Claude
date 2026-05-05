import { apiFetch } from './client';

interface AuthResponse {
  token: string;
  username: string;
  role: string;
}

export function signup(username: string, password: string): Promise<AuthResponse> {
  return apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
