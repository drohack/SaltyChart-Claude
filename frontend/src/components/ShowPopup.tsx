import { useEffect, useState } from 'react';
import { AnimeMedia, WatchlistEntry } from '../types';
import { getTitle } from '../lib/title';
import { useSettings } from '../contexts/SettingsContext';
import { getAnimeNicknames } from '../api/watchlist';

interface NicknameRow {
  userId: number;
  username: string;
  nickname: string | null;
  postWatchRank: number | null;
  preWatchOrder: number;
}

interface Props {
  anime: AnimeMedia;
  myEntry: WatchlistEntry | undefined;
  visibleUserIds: Set<number>;
  onClose: () => void;
}

export default function ShowPopup({ anime, myEntry, visibleUserIds, onClose }: Props) {
  const { settings } = useSettings();
  const title = getTitle(anime.title, settings.titleLanguage);
  const [nicknames, setNicknames] = useState<NicknameRow[]>([]);

  useEffect(() => {
    getAnimeNicknames(anime.id).then(setNicknames).catch(() => {});
  }, [anime.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const others = nicknames.filter((n) => visibleUserIds.has(n.userId));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-start gap-3 p-5 border-b border-gray-200 dark:border-gray-700">
          {anime.coverImage?.medium && (
            <img src={anime.coverImage.medium} alt={title} className="w-16 rounded-lg aspect-[2/3] object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white leading-snug">{title}</h3>
            {anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {anime.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{g}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Own entry */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">My entry</p>
            {myEntry ? (
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                <p>Nickname: <span className="font-medium">{myEntry.nickname ?? '—'}</span></p>
                <p>Pre-watch order: <span className="font-medium">#{myEntry.preWatchOrder + 1}</span></p>
                {myEntry.postWatchRank !== null && (
                  <p>Post-watch rank: <span className="font-medium">#{myEntry.postWatchRank + 1}</span></p>
                )}
                <p>Status: <span className="font-medium">{myEntry.watched ? '✓ Watched' : '◯ Unwatched'}</span></p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not in your watchlist</p>
            )}
          </div>

          {/* Other users */}
          {others.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Others</p>
              <div className="space-y-2">
                {others.map((row) => (
                  <div key={row.userId} className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{row.username}:</span>{' '}
                    {row.nickname ?? '—'}
                    {row.postWatchRank !== null && <span className="text-gray-400 ml-1">(rank #{row.postWatchRank + 1})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
