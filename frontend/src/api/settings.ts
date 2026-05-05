import { apiFetch } from './client';
import { UserSettings } from '../types';

export function getSettings(): Promise<UserSettings> {
  return apiFetch('/api/settings');
}

export function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(patch) });
}
