export interface AnimeTitle {
  english: string | null;
  romaji: string | null;
  native: string | null;
}

export interface AnimeMedia {
  id: number;
  title: AnimeTitle;
  coverImage: { large: string | null; medium: string | null } | null;
  description: string | null;
  genres: string[];
  isAdult: boolean;
  trailer: { id: string; site: string } | null;
  isSequel: boolean;
}

export interface WatchlistEntry {
  animeId: number;
  season: string;
  year: number;
  nickname: string | null;
  preWatchOrder: number;
  watched: boolean;
  watchedAt: string | null;
  postWatchRank: number | null;
  hidden: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system' | 'high-contrast';
  titleLanguage: 'english' | 'romaji' | 'native';
  autoplay: boolean;
  hideFromCompare: boolean;
  nicknameUserSelection: number[];
}

export interface User {
  id: number;
  username: string;
}

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
