import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserSettings } from '../types';
import * as settingsApi from '../api/settings';
import { useAuth } from './AuthContext';

const DEFAULTS: UserSettings = {
  theme: 'system',
  titleLanguage: 'english',
  autoplay: true,
  hideFromCompare: false,
  nicknameUserSelection: [],
};

function loadLocalSettings(): UserSettings {
  try {
    const s = localStorage.getItem('sc_settings');
    if (s) return { ...DEFAULTS, ...(JSON.parse(s) as Partial<UserSettings>) };
  } catch {}
  return DEFAULTS;
}

function applyTheme(theme: UserSettings['theme']): void {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // high-contrast builds on dark as its base (black bg + white text)
  const isDark = theme === 'dark' || theme === 'high-contrast' || (theme === 'system' && systemDark);
  root.classList.toggle('dark', isDark);
  root.classList.toggle('hc', theme === 'high-contrast');
}

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(loadLocalSettings);

  // Fetch server settings when authenticated
  useEffect(() => {
    if (!token) {
      setSettings(loadLocalSettings());
      return;
    }
    settingsApi.getSettings().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
    }).catch(() => {});
  }, [token]);

  // React to system dark mode changes
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    const merged = { ...settings, ...patch };
    setSettings(merged);
    localStorage.setItem('sc_settings', JSON.stringify(merged));
    if (user) {
      await settingsApi.updateSettings(patch);
    }
  }, [settings, user]);

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
