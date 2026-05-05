import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getUsers } from '../api/users';
import { User, UserSettings } from '../types';

interface Props { onClose: () => void; }

export default function SettingsModal({ onClose }: Props) {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getUsers().then(setUsers).catch(() => {});
    }
  }, [user]);

  async function save() {
    setSaving(true);
    try {
      await updateSettings(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function patch<K extends keyof UserSettings>(k: K, v: UserSettings[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  const labelCls = 'text-sm font-medium text-gray-700 dark:text-gray-300';
  const radioGroupCls = 'flex flex-wrap gap-2';
  const radioCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm border cursor-pointer transition-colors ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
    }`;

  function toggleNicknameUser(id: number) {
    const sel = draft.nicknameUserSelection;
    patch('nicknameUserSelection', sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  }

  const otherUsers = users.filter((u) => u.username !== user?.username);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Options</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme */}
          <div>
            <p className={labelCls + ' mb-2'}>Theme</p>
            <div className={radioGroupCls}>
              {(['light', 'dark', 'system', 'high-contrast'] as const).map((t) => (
                <button key={t} onClick={() => patch('theme', t)} className={radioCls(draft.theme === t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Title language */}
          <div>
            <p className={labelCls + ' mb-2'}>Title language</p>
            <div className={radioGroupCls}>
              {(['english', 'romaji', 'native'] as const).map((l) => (
                <button key={l} onClick={() => patch('titleLanguage', l)} className={radioCls(draft.titleLanguage === l)}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Autoplay */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className={labelCls}>Video autoplay</span>
            <div
              onClick={() => patch('autoplay', !draft.autoplay)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${draft.autoplay ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${draft.autoplay ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>

          {/* Hide from compare */}
          {user && (
            <label className="flex items-center justify-between cursor-pointer">
              <span className={labelCls}>Hide my list from Compare</span>
              <div
                onClick={() => patch('hideFromCompare', !draft.hideFromCompare)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${draft.hideFromCompare ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${draft.hideFromCompare ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          )}

          {/* Nickname user picker */}
          {user && otherUsers.length > 0 && (
            <div>
              <p className={labelCls + ' mb-2'}>Nicknames from</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {otherUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.nicknameUserSelection.includes(u.id)}
                      onChange={() => toggleNicknameUser(u.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{u.username}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm text-white font-medium transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
