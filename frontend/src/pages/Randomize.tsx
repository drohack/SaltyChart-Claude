import { useState, useEffect, useMemo } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Season, AnimeMedia, WatchlistEntry, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getSeasonAnime } from '../api/anime';
import { getMyWatchlist, toggleHidden, updateRank } from '../api/watchlist';
import { getUsersWithSeason } from '../api/users';
import { getTitle } from '../lib/title';
import { loadLastSeason, saveLastSeason, seasonLabel, yearRange } from '../lib/season';
import Wheel from '../components/Wheel';
import ShowPopup from '../components/ShowPopup';

const SEASONS: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

// ── Sortable row for post-watch ranking ───────────────────────────────────────
function SortableRow({ entry, anime, titleLang }: { entry: WatchlistEntry; anime: AnimeMedia | undefined; titleLang: 'english' | 'romaji' | 'native' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.animeId });
  const title = anime ? getTitle(anime.title, titleLang) : `#${entry.animeId}`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 select-none"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
        aria-label="Drag to reorder"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zM8 14a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zM8 22a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {anime?.coverImage?.medium && (
        <img src={anime.coverImage.medium} alt={title} className="w-8 h-12 object-cover rounded shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{title}</p>
        {entry.nickname && <p className="text-xs text-gray-400 truncate">{entry.nickname}</p>}
      </div>
      <span className="shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500 w-6 text-right">
        #{(entry.postWatchRank ?? 0) + 1}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Randomize() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [season, setSeason] = useState<Season>(() => loadLastSeason().season);
  const [year, setYear] = useState<number>(() => loadLastSeason().year);
  const [anime, setAnime] = useState<AnimeMedia[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersWithSeason, setUsersWithSeason] = useState<User[]>([]);
  const [enabledUserIds, setEnabledUserIds] = useState<Set<number>>(new Set());
  const [popup, setPopup] = useState<AnimeMedia | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const animeMap = useMemo(() => new Map(anime.map((a) => [a.id, a])), [anime]);

  function changeSeasonYear(s: Season, y: number) {
    setSeason(s);
    setYear(y);
    saveLastSeason(s, y);
    // Reset side panel selections when season changes
    setEnabledUserIds(new Set());
  }

  // Fetch anime + watchlist + season users
  useEffect(() => {
    setLoading(true);
    const p1 = getSeasonAnime(season, year).then(setAnime);
    const p2 = user ? getMyWatchlist(season, year).then(setWatchlist) : Promise.resolve();
    Promise.all([p1, p2]).finally(() => setLoading(false));
  }, [season, year, user]);

  // Auto-check users who have entries for this season
  useEffect(() => {
    if (!user) return;
    getUsersWithSeason(season, year).then((list) => {
      setUsersWithSeason(list);
      // Auto-enable all users with entries (excluding self)
      setEnabledUserIds(new Set(
        list.filter((u) => u.username !== user.username).map((u) => u.id),
      ));
    }).catch(() => {});
  }, [season, year, user]);

  // Wheel entries: unwatched + not hidden
  const wheelEntries = useMemo(() =>
    watchlist
      .filter((e) => !e.watched && !e.hidden)
      .sort((a, b) => a.preWatchOrder - b.preWatchOrder)
      .map((e) => animeMap.get(e.animeId))
      .filter((a): a is AnimeMedia => !!a),
    [watchlist, animeMap],
  );

  // Watched entries sorted by post-watch rank for drag list
  const watchedEntries = useMemo(() =>
    watchlist
      .filter((e) => e.watched)
      .sort((a, b) => (a.postWatchRank ?? 999) - (b.postWatchRank ?? 999)),
    [watchlist],
  );

  async function handleToggleHidden(animeId: number, season: Season, year: number) {
    const res = await toggleHidden(animeId, season, year);
    setWatchlist((prev) =>
      prev.map((e) => e.animeId === animeId ? { ...e, hidden: res.hidden } : e),
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = watchedEntries.map((e) => e.animeId);
    const oldIdx = ids.indexOf(active.id as number);
    const newIdx = ids.indexOf(over.id as number);
    const reordered = arrayMove(watchedEntries, oldIdx, newIdx);

    // Optimistic update
    setWatchlist((prev) => {
      const map = new Map(prev.map((e) => [e.animeId, e]));
      reordered.forEach((e, i) => { const entry = map.get(e.animeId); if (entry) map.set(e.animeId, { ...entry, postWatchRank: i }); });
      return [...map.values()];
    });

    // Persist each rank
    await Promise.all(reordered.map((e, i) => updateRank(e.animeId, season, year, i)));
  }

  function toggleUser(id: number) {
    setEnabledUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const otherUsers = usersWithSeason.filter((u) => u.username !== user?.username);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Sign in to use the randomizer.</p>
        <a href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">Sign in →</a>
      </div>
    );
  }

  const selectCls = 'px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div>
      {/* Season selector */}
      <div className="flex flex-wrap gap-3 items-center mb-8">
        <select value={season} onChange={(e) => changeSeasonYear(e.target.value as Season, year)} className={selectCls}>
          {SEASONS.map((s) => <option key={s} value={s}>{seasonLabel(s)}</option>)}
        </select>
        <select value={year} onChange={(e) => changeSeasonYear(season, Number(e.target.value))} className={selectCls}>
          {yearRange().map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {wheelEntries.length} unwatched in wheel
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Wheel */}
        <div className="flex flex-col items-center gap-6 flex-1">
          <Wheel entries={wheelEntries} loading={loading} onResult={setPopup} />

          {/* Unwatched entry list with hide toggle */}
          {watchlist.filter((e) => !e.watched).length > 0 && (
            <div className="w-full max-w-sm">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Unwatched
              </h3>
              <div className="space-y-1.5">
                {watchlist
                  .filter((e) => !e.watched)
                  .sort((a, b) => a.preWatchOrder - b.preWatchOrder)
                  .map((entry) => {
                    const a = animeMap.get(entry.animeId);
                    const title = a ? getTitle(a.title, settings.titleLanguage) : `#${entry.animeId}`;
                    return (
                      <div
                        key={entry.animeId}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          entry.hidden
                            ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                        } border border-gray-200 dark:border-gray-700`}
                      >
                        <span className="flex-1 truncate">{title}</span>
                        <button
                          onClick={() => handleToggleHidden(entry.animeId, season, year)}
                          title={entry.hidden ? 'Show in wheel' : 'Hide from wheel'}
                          className="shrink-0 text-xs px-2 py-0.5 rounded border transition-colors border-gray-300 dark:border-gray-600 hover:border-indigo-400 text-gray-500 dark:text-gray-400"
                        >
                          {entry.hidden ? '◯ Show' : '⊘ Hide'}
                        </button>
                        <button
                          onClick={() => a && setPopup(a)}
                          title="View details"
                          className="shrink-0 text-gray-400 hover:text-indigo-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Post-watch drag ranking */}
          {watchedEntries.length > 0 && (
            <div className="w-full max-w-sm">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Post-watch ranking
              </h3>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={watchedEntries.map((e) => e.animeId)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {watchedEntries.map((entry) => (
                      <SortableRow
                        key={entry.animeId}
                        entry={entry}
                        anime={animeMap.get(entry.animeId)}
                        titleLang={settings.titleLanguage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        {/* Right: Nicknames from panel */}
        {otherUsers.length > 0 && (
          <aside className="lg:w-48 shrink-0">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
              Nicknames from
            </h3>
            <div className="space-y-1.5">
              {otherUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledUserIds.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{u.username}</span>
                </label>
              ))}
            </div>
          </aside>
        )}
      </div>

      {popup && (
        <ShowPopup
          anime={popup}
          myEntry={watchlist.find((e) => e.animeId === popup.id)}
          visibleUserIds={enabledUserIds}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
