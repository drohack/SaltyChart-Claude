import { apiFetch } from './client';
import { AnimeMedia, Season } from '../types';

export function getSeasonAnime(season: Season, year: number): Promise<AnimeMedia[]> {
  return apiFetch(`/api/anime?season=${season}&year=${year}`);
}
