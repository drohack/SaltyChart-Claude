import { getDb } from './db';
import { AppError } from './errors';

const ANILIST_URL = 'https://graphql.anilist.co';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type AnilistSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export interface AnimeMedia {
  id: number;
  title: { english: string | null; romaji: string | null; native: string | null };
  coverImage: { large: string | null; medium: string | null } | null;
  description: string | null;
  genres: string[];
  isAdult: boolean;
  trailer: { id: string; site: string } | null;
  isSequel: boolean;
}

const memoryCache = new Map<string, { data: AnimeMedia[]; fetchedAt: number }>();

export function clearMemoryCache(): void {
  memoryCache.clear();
}

const SEASON_QUERY = `
query ($season: MediaSeason, $year: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
      id
      title { english romaji native }
      coverImage { large medium }
      description(asHtml: false)
      genres
      isAdult
      trailer { id site }
      relations {
        edges {
          relationType
          node { type }
        }
      }
    }
  }
}`;

type RawEdge = { relationType: string; node: { type: string } };

function hasPrequel(relations: { edges: RawEdge[] } | null): boolean {
  return (relations?.edges ?? []).some(
    (e) => (e.relationType === 'PREQUEL' || e.relationType === 'PARENT') && e.node.type === 'ANIME',
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMedia(m: any): AnimeMedia {
  return {
    id: m.id,
    title: m.title ?? { english: null, romaji: null, native: null },
    coverImage: m.coverImage ?? null,
    description: m.description ?? null,
    genres: m.genres ?? [],
    isAdult: !!m.isAdult,
    trailer: m.trailer?.site === 'youtube' ? { id: m.trailer.id, site: 'youtube' } : null,
    isSequel: hasPrequel(m.relations ?? null),
  };
}

async function anilistPost(body: unknown, retries = 3): Promise<unknown> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    if (retries > 0) {
      const wait = parseInt(res.headers.get('retry-after') ?? '60', 10) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      return anilistPost(body, retries - 1);
    }
    throw new AppError(503, 'UPSTREAM_ERROR', 'AniList rate limit exceeded');
  }

  if (!res.ok) {
    throw new AppError(502, 'UPSTREAM_ERROR', `AniList returned ${res.status}`);
  }

  return res.json();
}

async function fetchAllPages(season: AnilistSeason, year: number): Promise<AnimeMedia[]> {
  const all: AnimeMedia[] = [];
  let page = 1;

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await anilistPost({ query: SEASON_QUERY, variables: { season, year, page } })) as any;
    const pageData = json?.data?.Page;
    if (!pageData) throw new AppError(502, 'UPSTREAM_ERROR', 'Unexpected AniList response shape');

    all.push(...(pageData.media ?? []).map(normaliseMedia));

    if (!pageData.pageInfo?.hasNextPage || page >= 10) break;
    page++;
  }

  return all;
}

export async function getSeasonAnime(season: AnilistSeason, year: number): Promise<AnimeMedia[]> {
  const key = `${season}_${year}`;
  const now = Date.now();

  // 1. Memory fast path
  const mem = memoryCache.get(key);
  if (mem && now - mem.fetchedAt < CACHE_TTL_MS) return mem.data;

  // 2. DB cache
  const db = getDb();
  const row = db
    .prepare('SELECT payload, fetched_at FROM season_cache WHERE season = ? AND year = ?')
    .get(season, year) as { payload: string; fetched_at: string } | undefined;

  if (row) {
    const dbAge = now - new Date(row.fetched_at + 'Z').getTime();
    if (dbAge < CACHE_TTL_MS) {
      const data = JSON.parse(row.payload) as AnimeMedia[];
      memoryCache.set(key, { data, fetchedAt: now });
      return data;
    }
  }

  // 3. Fetch from AniList
  const data = await fetchAllPages(season, year);

  db.prepare(`
    INSERT INTO season_cache (season, year, payload, fetched_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (season, year) DO UPDATE
      SET payload = excluded.payload, fetched_at = excluded.fetched_at
  `).run(season, year, JSON.stringify(data));

  memoryCache.set(key, { data, fetchedAt: now });
  return data;
}
