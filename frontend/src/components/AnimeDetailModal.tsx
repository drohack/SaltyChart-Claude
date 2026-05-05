import { useEffect, useRef } from 'react';
import { AnimeMedia, WatchlistEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getTitle } from '../lib/title';

interface Props {
  anime: AnimeMedia;
  entry: WatchlistEntry | undefined;
  onClose: () => void;
  onAddToWatchlist: () => void;
  onRemoveFromWatchlist: () => void;
}

export default function AnimeDetailModal({
  anime, entry, onClose, onAddToWatchlist, onRemoveFromWatchlist,
}: Props) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const title = getTitle(anime.title, settings.titleLanguage);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const inWatchlist = !!entry;

  // Strip HTML tags from description
  const description = anime.description
    ? anime.description.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim()
    : null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
          {anime.coverImage?.medium && (
            <img
              src={anime.coverImage.medium}
              alt={title}
              className="w-20 shrink-0 rounded-lg object-cover aspect-[2/3]"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {anime.isAdult && (
              <span className="inline-block mt-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded">
                18+
              </span>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {anime.genres.map((g) => (
                <span
                  key={g}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Trailer */}
          {anime.trailer?.site === 'youtube' && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${anime.trailer.id}${settings.autoplay ? '?autoplay=1&mute=1' : ''}`}
                title={`${title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-6">
              {description}
            </p>
          )}

          {/* Watchlist action */}
          {user && (
            <div className="pt-2">
              {inWatchlist ? (
                <button
                  onClick={onRemoveFromWatchlist}
                  className="w-full py-2 px-4 rounded-lg border-2 border-red-500 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  Remove from watchlist
                </button>
              ) : (
                <button
                  onClick={onAddToWatchlist}
                  className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                >
                  Add to watchlist
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
