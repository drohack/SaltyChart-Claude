import { AnimeMedia } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { getTitle } from '../lib/title';

interface Props {
  anime: AnimeMedia;
  inWatchlist: boolean;
  onClick: () => void;
}

export default function AnimeCard({ anime, inWatchlist, onClick }: Props) {
  const { settings } = useSettings();
  const title = getTitle(anime.title, settings.titleLanguage);

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col rounded-lg overflow-hidden text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 ${
        inWatchlist
          ? 'ring-2 ring-indigo-500 dark:ring-indigo-400'
          : 'ring-1 ring-gray-200 dark:ring-gray-700'
      }`}
      aria-label={title}
    >
      <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-800 overflow-hidden">
        {anime.coverImage?.large ? (
          <img
            src={anime.coverImage.large}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs px-2 text-center">
            No cover
          </div>
        )}
        {anime.isAdult && (
          <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            18+
          </span>
        )}
      </div>
      <div className="p-2 bg-white dark:bg-gray-900 flex-1">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
          {title}
        </p>
      </div>
    </button>
  );
}
