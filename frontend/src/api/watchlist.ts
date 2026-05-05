import { apiFetch } from './client';
import { WatchlistEntry, Season } from '../types';

export function getMyWatchlist(season: Season, year: number): Promise<WatchlistEntry[]> {
  return apiFetch(`/api/watchlist?season=${season}&year=${year}`);
}

export function addToWatchlist(animeId: number, season: Season, year: number): Promise<{ ok: boolean }> {
  return apiFetch('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify({ animeId, season, year }),
  });
}

export function removeFromWatchlist(animeId: number, season: Season, year: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/watchlist/${animeId}?season=${season}&year=${year}`, { method: 'DELETE' });
}

export function toggleWatched(animeId: number, season: Season, year: number): Promise<{ watched: boolean }> {
  return apiFetch(`/api/watchlist/${animeId}/watched?season=${season}&year=${year}`, { method: 'PATCH' });
}

export function updateRank(animeId: number, season: Season, year: number, rank: number | null): Promise<{ ok: boolean }> {
  return apiFetch(`/api/watchlist/${animeId}/rank?season=${season}&year=${year}`, {
    method: 'PATCH',
    body: JSON.stringify({ rank }),
  });
}

export function toggleHidden(animeId: number, season: Season, year: number): Promise<{ hidden: boolean }> {
  return apiFetch(`/api/watchlist/${animeId}/hidden?season=${season}&year=${year}`, { method: 'PATCH' });
}

export function updateNickname(animeId: number, season: Season, year: number, nickname: string | null): Promise<{ ok: boolean }> {
  return apiFetch(`/api/watchlist/${animeId}/nickname?season=${season}&year=${year}`, {
    method: 'PATCH',
    body: JSON.stringify({ nickname }),
  });
}

export function bulkReplaceWatchlist(season: Season, year: number, entries: { animeId: number; preWatchOrder: number; nickname?: string | null }[]): Promise<{ ok: boolean }> {
  return apiFetch(`/api/watchlist?season=${season}&year=${year}`, {
    method: 'PUT',
    body: JSON.stringify(entries),
  });
}

export function getUserWatchlist(userId: number, season: Season, year: number): Promise<WatchlistEntry[]> {
  return apiFetch(`/api/watchlist/user/${userId}?season=${season}&year=${year}`);
}

export function getAnimeNicknames(animeId: number): Promise<{ userId: number; username: string; nickname: string | null; postWatchRank: number | null; preWatchOrder: number }[]> {
  return apiFetch(`/api/watchlist/anime/${animeId}/nicknames`);
}
