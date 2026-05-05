import { Season } from '../types';
import { seasonLabel, yearRange } from '../lib/season';

const SEASONS: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

interface Props {
  season: Season;
  year: number;
  search: string;
  hideAdult: boolean;
  hideSequels: boolean;
  hideInList: boolean;
  onSeasonChange: (s: Season) => void;
  onYearChange: (y: number) => void;
  onSearchChange: (q: string) => void;
  onToggle: (key: 'hideAdult' | 'hideSequels' | 'hideInList') => void;
}

export default function SeasonToolbar({
  season, year, search, hideAdult, hideSequels, hideInList,
  onSeasonChange, onYearChange, onSearchChange, onToggle,
}: Props) {
  const selectCls = 'px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const toggleCls = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer select-none ${
      on
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
    }`;

  return (
    <div className="flex flex-wrap gap-3 items-center mb-6">
      <select
        value={season}
        onChange={(e) => onSeasonChange(e.target.value as Season)}
        className={selectCls}
        aria-label="Season"
      >
        {SEASONS.map((s) => (
          <option key={s} value={s}>{seasonLabel(s)}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className={selectCls}
        aria-label="Year"
      >
        {yearRange().map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0 w-36"
      />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onToggle('hideAdult')} className={toggleCls(hideAdult)}>Hide 18+</button>
        <button onClick={() => onToggle('hideSequels')} className={toggleCls(hideSequels)}>Hide sequels</button>
        <button onClick={() => onToggle('hideInList')} className={toggleCls(hideInList)}>Hide in list</button>
      </div>
    </div>
  );
}
