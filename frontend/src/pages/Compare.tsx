import { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Season, AnimeMedia, WatchlistEntry, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getSeasonAnime } from '../api/anime';
import { getMyWatchlist, getUserWatchlist } from '../api/watchlist';
import { getUsers } from '../api/users';
import { getTitle } from '../lib/title';
import { loadLastSeason, seasonLabel, yearRange } from '../lib/season';

const SEASONS: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

type RankMode = 'pre' | 'post';

function getRank(entry: WatchlistEntry | undefined, mode: RankMode): number | null {
  if (!entry) return null;
  if (mode === 'pre') return entry.preWatchOrder;
  return entry.postWatchRank;
}

function diffClass(diff: number | null): string {
  if (diff === null) return 'bg-gray-100 dark:bg-gray-800 text-gray-400';
  if (diff === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
  const abs = Math.abs(diff);
  if (abs <= 2) return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300';
  if (abs <= 5) return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
  return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
}

function diffLabel(diff: number | null): string {
  if (diff === null) return '?';
  if (diff === 0) return '=';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function rankLabel(r: number | null): string {
  return r === null ? '—' : `#${r + 1}`;
}

interface CompareItem {
  animeId: number;
  anime: AnimeMedia | undefined;
  myEntry: WatchlistEntry | undefined;
  theirEntry: WatchlistEntry | undefined;
}

export default function Compare() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const cardsRef = useRef<HTMLDivElement>(null);

  const saved = loadLastSeason();
  const [season, setSeason] = useState<Season>(saved.season);
  const [year, setYear] = useState<number>(saved.year);
  const [myMode, setMyMode] = useState<RankMode>('pre');
  const [theirMode, setTheirMode] = useState<RankMode>('pre');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [anime, setAnime] = useState<AnimeMedia[]>([]);
  const [myList, setMyList] = useState<WatchlistEntry[]>([]);
  const [theirList, setTheirList] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const animeMap = useMemo(() => new Map(anime.map((a) => [a.id, a])), [anime]);

  // Load user list
  useEffect(() => {
    if (!user) return;
    getUsers().then((list) => {
      const others = list.filter((u) => u.username !== user.username);
      setUsers(others);
      if (others.length > 0) setSelectedUserId(others[0].id);
    }).catch(() => {});
  }, [user]);

  // Load data when season/year/selectedUser changes
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const p1 = getSeasonAnime(season, year).then(setAnime);
    const p2 = getMyWatchlist(season, year).then(setMyList);
    const p3 = selectedUserId
      ? getUserWatchlist(selectedUserId, season, year).then(setTheirList)
      : Promise.resolve(setTheirList([]));
    Promise.all([p1, p2, p3]).finally(() => setLoading(false));
  }, [season, year, user, selectedUserId]);

  // Shows present in both lists
  const paired = useMemo<CompareItem[]>(() => {
    const theirMap = new Map(theirList.map((e) => [e.animeId, e]));
    return myList
      .filter((e) => theirMap.has(e.animeId))
      .map((e) => ({
        animeId: e.animeId,
        anime: animeMap.get(e.animeId),
        myEntry: e,
        theirEntry: theirMap.get(e.animeId),
      }));
  }, [myList, theirList, animeMap]);

  // Sort by my rank (ascending), nulls last
  const sorted = useMemo<CompareItem[]>(() => {
    return [...paired].sort((a, b) => {
      const ra = getRank(a.myEntry, myMode) ?? Infinity;
      const rb = getRank(b.myEntry, myMode) ?? Infinity;
      return ra - rb;
    });
  }, [paired, myMode]);

  async function shareAsImage() {
    if (!cardsRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardsRef.current, { useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `saltychart-compare-${season}-${year}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { /* html2canvas may fail on cross-origin images */ } finally {
      setSharing(false);
    }
  }

  const selectCls = 'px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const modeCls = (active: boolean) =>
    `px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
    }`;

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Sign in to use Compare.</p>
        <a href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">Sign in →</a>
      </div>
    );
  }

  return (
    <div>
      {/* ── Sticky header ── */}
      <div className="sticky top-14 z-30 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-2 mb-4 -mx-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <span className="flex-1 text-center font-semibold text-indigo-600 dark:text-indigo-400 truncate">
            {user.username}
          </span>
          <span className="text-xs text-gray-400 mx-3">vs</span>
          <span className="flex-1 text-center font-semibold text-purple-600 dark:text-purple-400 truncate">
            {selectedUser?.username ?? '—'}
          </span>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="mb-6 space-y-3">
        {/* Row 1: season + year */}
        <div className="flex flex-wrap gap-3">
          <select value={season} onChange={(e) => setSeason(e.target.value as Season)} className={selectCls}>
            {SEASONS.map((s) => <option key={s} value={s}>{seasonLabel(s)}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
            {yearRange().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Row 2: two-column user controls with bottom-aligned pre/post pickers */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{user.username}</span>
            <div className="flex gap-1">
              <button onClick={() => setMyMode('pre')} className={modeCls(myMode === 'pre')}>Pre-watch</button>
              <button onClick={() => setMyMode('post')} className={modeCls(myMode === 'post')}>Post-watch</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <select
              value={selectedUserId ?? ''}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className={selectCls + ' w-full'}
            >
              {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              {users.length === 0 && <option value="">No other users</option>}
            </select>
            <div className="flex gap-1">
              <button onClick={() => setTheirMode('pre')} className={modeCls(theirMode === 'pre')}>Pre-watch</button>
              <button onClick={() => setTheirMode('post')} className={modeCls(theirMode === 'post')}>Post-watch</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop-only legend + share button ── */}
      <div className="hidden md:flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Diff:</span>
          {[
            { label: '=', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
            { label: '±1–2', cls: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
            { label: '±3–5', cls: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' },
            { label: '±6+', cls: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
          ].map(({ label, cls }) => (
            <span key={label} className={`px-2 py-0.5 rounded font-mono font-bold ${cls}`}>{label}</span>
          ))}
        </div>
        <button
          onClick={shareAsImage}
          disabled={sharing || sorted.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400 disabled:opacity-40 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {sharing ? 'Capturing…' : 'Share as PNG'}
        </button>
      </div>

      {/* ── Status ── */}
      {loading && (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!loading && sorted.length === 0 && selectedUser && (
        <p className="text-center py-12 text-gray-400">
          No shows in common with {selectedUser.username} for {seasonLabel(season)} {year}.
        </p>
      )}

      {/* ── Cards ── */}
      {!loading && sorted.length > 0 && (
        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(({ animeId, anime: a, myEntry, theirEntry }) => {
            const myRank = getRank(myEntry, myMode);
            const theirRank = getRank(theirEntry, theirMode);
            const diff = myRank !== null && theirRank !== null ? myRank - theirRank : null;
            const myNick = myEntry?.nickname;
            const theirNick = theirEntry?.nickname;
            const canonicalTitle = a ? getTitle(a.title, settings.titleLanguage) : `#${animeId}`;

            return (
              <div
                key={animeId}
                className="flex gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
              >
                {/* Thumbnail */}
                {a?.coverImage?.medium ? (
                  <img
                    src={a.coverImage.medium}
                    alt={canonicalTitle}
                    className="w-12 aspect-[2/3] object-cover rounded-lg shrink-0"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-12 aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-lg shrink-0" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                  {/* Nicknames (primary) */}
                  <div>
                    {myNick && (
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 truncate leading-tight">
                        {myNick}
                      </p>
                    )}
                    {theirNick && (
                      <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 truncate leading-tight">
                        {theirNick}
                      </p>
                    )}
                    {/* Canonical title (secondary) */}
                    <p className="text-xs italic text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {canonicalTitle}
                    </p>
                  </div>

                  {/* Rank strip */}
                  <div className="flex items-center gap-1">
                    <span className="flex-1 text-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {rankLabel(myRank)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold font-mono shrink-0 ${diffClass(diff)}`}>
                      {diffLabel(diff)}
                    </span>
                    <span className="flex-1 text-center text-sm font-bold text-purple-600 dark:text-purple-400">
                      {rankLabel(theirRank)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sorted.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-right">{sorted.length} shared shows</p>
      )}
    </div>
  );
}
