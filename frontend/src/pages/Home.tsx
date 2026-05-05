import { useState, useEffect, useMemo } from 'react';
import { Season, AnimeMedia, WatchlistEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getSeasonAnime } from '../api/anime';
import { getMyWatchlist, addToWatchlist, removeFromWatchlist, toggleWatched } from '../api/watchlist';
import {
  loadLastSeason, saveLastSeason, currentSeason,
  daysUntilNextSeason, nextSeasonName, seasonLabel,
} from '../lib/season';
import SeasonToolbar from '../components/SeasonToolbar';
import AnimeCard from '../components/AnimeCard';
import AnimeDetailModal from '../components/AnimeDetailModal';

export default function Home() {
  const { user } = useAuth();

  const [season, setSeason] = useState<Season>(() => loadLastSeason().season);
  const [year, setYear] = useState<number>(() => loadLastSeason().year);
  const [anime, setAnime] = useState<AnimeMedia[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AnimeMedia | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [hideAdult, setHideAdult] = useState(false);
  const [hideSequels, setHideSequels] = useState(false);
  const [hideInList, setHideInList] = useState(false);

  // Fetch anime when season/year changes
  useEffect(() => {
    saveLastSeason(season, year);
    setLoading(true);
    setError('');
    getSeasonAnime(season, year)
      .then(setAnime)
      .catch(() => setError('Failed to load anime. Please try again.'))
      .finally(() => setLoading(false));
  }, [season, year]);

  // Fetch watchlist when user or season changes
  useEffect(() => {
    if (!user) { setWatchlist([]); return; }
    getMyWatchlist(season, year).then(setWatchlist).catch(() => {});
  }, [user, season, year]);

  const watchlistSet = useMemo(() => new Set(watchlist.map((e) => e.animeId)), [watchlist]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return anime.filter((a) => {
      if (hideAdult && a.isAdult) return false;
      if (hideSequels && a.isSequel) return false;
      if (hideInList && watchlistSet.has(a.id)) return false;
      if (q) {
        const titleMatch = [a.title.english, a.title.romaji, a.title.native]
          .some((t) => t?.toLowerCase().includes(q));
        if (!titleMatch) return false;
      }
      return true;
    });
  }, [anime, hideAdult, hideSequels, hideInList, watchlistSet, search]);

  function handleToggle(key: 'hideAdult' | 'hideSequels' | 'hideInList') {
    if (key === 'hideAdult') setHideAdult((v) => !v);
    if (key === 'hideSequels') setHideSequels((v) => !v);
    if (key === 'hideInList') setHideInList((v) => !v);
  }

  function handleSeasonChange(s: Season) { setSeason(s); }
  function handleYearChange(y: number) { setYear(y); }

  async function handleAdd(animeId: number) {
    await addToWatchlist(animeId, season, year);
    const updated = await getMyWatchlist(season, year);
    setWatchlist(updated);
  }

  async function handleRemove(animeId: number) {
    await removeFromWatchlist(animeId, season, year);
    setWatchlist((prev) => prev.filter((e) => e.animeId !== animeId));
  }

  async function handleToggleWatched(animeId: number) {
    const res = await toggleWatched(animeId, season, year);
    setWatchlist((prev) =>
      prev.map((e) => e.animeId === animeId ? { ...e, watched: res.watched, watchedAt: res.watched ? new Date().toISOString() : null } : e),
    );
  }

  // Days until next season
  const days = daysUntilNextSeason();
  const { season: nextSeason, year: nextYear } = nextSeasonName();
  const { season: cur, year: curYear } = currentSeason();
  const isCurrentSeason = season === cur && year === curYear;

  const selectedEntry = selected ? watchlist.find((e) => e.animeId === selected.id) : undefined;

  return (
    <div>
      {/* Season info banner */}
      {isCurrentSeason && (
        <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {days === 0
            ? `${seasonLabel(nextSeason)} ${nextYear} starts today!`
            : `${days} day${days === 1 ? '' : 's'} until ${seasonLabel(nextSeason)} ${nextYear}`}
        </div>
      )}

      <SeasonToolbar
        season={season}
        year={year}
        search={search}
        hideAdult={hideAdult}
        hideSequels={hideSequels}
        hideInList={hideInList}
        onSeasonChange={handleSeasonChange}
        onYearChange={handleYearChange}
        onSearchChange={setSearch}
        onToggle={handleToggle}
      />

      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {anime.length === 0 ? 'No anime found for this season.' : 'No results match your filters.'}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((a) => (
            <AnimeCard
              key={a.id}
              anime={a}
              inWatchlist={watchlistSet.has(a.id)}
              onClick={() => setSelected(a)}
            />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <p className="mt-4 text-xs text-gray-400 text-right">
          {filtered.length} of {anime.length} shown
        </p>
      )}

      {selected && (
        <AnimeDetailModal
          anime={selected}
          entry={selectedEntry}
          onClose={() => setSelected(null)}
          onAddToWatchlist={async () => { await handleAdd(selected.id); }}
          onRemoveFromWatchlist={async () => { await handleRemove(selected.id); setSelected(null); }}
          onToggleWatched={async () => { await handleToggleWatched(selected.id); }}
        />
      )}
    </div>
  );
}
