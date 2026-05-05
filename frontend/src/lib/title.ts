import { AnimeTitle, UserSettings } from '../types';

export function getTitle(title: AnimeTitle, lang: UserSettings['titleLanguage']): string {
  if (lang === 'romaji') return title.romaji ?? title.english ?? title.native ?? '—';
  if (lang === 'native') return title.native ?? title.romaji ?? title.english ?? '—';
  return title.english ?? title.romaji ?? title.native ?? '—';
}
