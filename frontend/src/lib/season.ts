import { Season } from '../types';

const SEASON_ORDER: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

export function monthToSeason(month: number): Season {
  if (month <= 2 || month === 12) return 'WINTER';
  if (month <= 5) return 'SPRING';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
}

export function currentSeason(): { season: Season; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const season = monthToSeason(month);
  return { season, year: season === 'WINTER' && month === 12 ? year : year };
}

function nextSeasonStart(from: Date): Date {
  const year = from.getFullYear();
  const boundaries = [
    new Date(year, 2, 1),  // Mar 1
    new Date(year, 5, 1),  // Jun 1
    new Date(year, 8, 1),  // Sep 1
    new Date(year, 11, 1), // Dec 1
  ];
  for (const b of boundaries) {
    if (b > from) return b;
  }
  return new Date(year + 1, 2, 1);
}

export function daysUntilNextSeason(): number {
  const now = new Date();
  const next = nextSeasonStart(now);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function nextSeasonName(): { season: Season; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const cur = monthToSeason(month);
  const idx = SEASON_ORDER.indexOf(cur);
  const nextIdx = (idx + 1) % 4;
  const nextSeason = SEASON_ORDER[nextIdx];
  const nextYear = nextSeason === 'WINTER' ? year + 1 : year;
  return { season: nextSeason, year: nextYear };
}

export function prevSeason(season: Season, year: number): { season: Season; year: number } {
  const idx = SEASON_ORDER.indexOf(season);
  const prevIdx = (idx - 1 + 4) % 4;
  const prev = SEASON_ORDER[prevIdx];
  return { season: prev, year: prev === 'FALL' ? year - 1 : year };
}

export function nextSeason(season: Season, year: number): { season: Season; year: number } {
  const idx = SEASON_ORDER.indexOf(season);
  const nIdx = (idx + 1) % 4;
  const next = SEASON_ORDER[nIdx];
  return { season: next, year: next === 'WINTER' ? year + 1 : year };
}

export function yearRange(): number[] {
  const y = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, i) => y - 5 + i);
}

const SEASON_LABELS: Record<Season, string> = {
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer',
  FALL: 'Fall',
};

export function seasonLabel(s: Season): string {
  return SEASON_LABELS[s];
}

export function loadLastSeason(): { season: Season; year: number } {
  try {
    const stored = localStorage.getItem('sc_last_season');
    if (stored) {
      const parsed = JSON.parse(stored) as { season: Season; year: number };
      if (SEASON_ORDER.includes(parsed.season) && typeof parsed.year === 'number') return parsed;
    }
  } catch {}
  return currentSeason();
}

export function saveLastSeason(season: Season, year: number): void {
  try {
    localStorage.setItem('sc_last_season', JSON.stringify({ season, year }));
  } catch {}
}
