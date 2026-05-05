import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDb, getDb } from '../db';
import { clearMemoryCache } from '../anilist';
import { errorHandler } from '../middleware/errorHandler';
import animeRouter from './anime';

const MOCK_ANILIST_RESPONSE = {
  data: {
    Page: {
      pageInfo: { hasNextPage: false },
      media: [
        {
          id: 1,
          title: { english: 'Test Anime', romaji: 'Tesuto Anime', native: 'テストアニメ' },
          coverImage: { large: 'https://example.com/cover.jpg', medium: 'https://example.com/sm.jpg' },
          description: 'A test anime.',
          genres: ['Action'],
          isAdult: false,
          trailer: { id: 'abc123', site: 'youtube' },
          relations: { edges: [] },
        },
      ],
    },
  },
};

function mockFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => MOCK_ANILIST_RESPONSE,
    }),
  );
}

function buildApp() {
  initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/anime', animeRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /api/anime', () => {
  const app = buildApp();

  beforeEach(() => {
    clearMemoryCache();
    // Clear DB cache so tests don't bleed into each other
    getDb().prepare('DELETE FROM season_cache').run();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 400 for missing season', async () => {
    const res = await request(app).get('/api/anime?year=2024');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for invalid season', async () => {
    const res = await request(app).get('/api/anime?season=MONSOON&year=2024');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for missing year', async () => {
    const res = await request(app).get('/api/anime?season=SPRING');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('fetches from AniList and returns data', async () => {
    mockFetchOk();
    const res = await request(app).get('/api/anime?season=SPRING&year=2024');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(1);
    expect(res.body[0].title.english).toBe('Test Anime');
    expect(res.body[0].isSequel).toBe(false);
  });

  it('stores result in DB cache after fetch', async () => {
    mockFetchOk();
    await request(app).get('/api/anime?season=SPRING&year=2024');

    const row = getDb()
      .prepare('SELECT payload FROM season_cache WHERE season = ? AND year = ?')
      .get('SPRING', 2024) as { payload: string } | undefined;

    expect(row).toBeTruthy();
    expect(JSON.parse(row!.payload)[0].id).toBe(1);
  });

  it('serves second request from memory cache without re-fetching', async () => {
    mockFetchOk();
    await request(app).get('/api/anime?season=SPRING&year=2024');
    await request(app).get('/api/anime?season=SPRING&year=2024');

    // Only one AniList call despite two requests
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);
  });

  it('serves from DB cache after memory cache is cleared (no AniList call)', async () => {
    mockFetchOk();
    await request(app).get('/api/anime?season=SPRING&year=2024');
    clearMemoryCache();
    vi.unstubAllGlobals(); // fetch would throw if called

    const res = await request(app).get('/api/anime?season=SPRING&year=2024');
    expect(res.status).toBe(200);
    expect(res.body[0].title.english).toBe('Test Anime');
  });

  it('marks a sequel correctly via PREQUEL relation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            Page: {
              pageInfo: { hasNextPage: false },
              media: [
                {
                  id: 2,
                  title: { english: 'Sequel Anime', romaji: null, native: null },
                  coverImage: null,
                  description: null,
                  genres: [],
                  isAdult: false,
                  trailer: null,
                  relations: { edges: [{ relationType: 'PREQUEL', node: { type: 'ANIME' } }] },
                },
              ],
            },
          },
        }),
      }),
    );
    const res = await request(app).get('/api/anime?season=FALL&year=2023');
    expect(res.status).toBe(200);
    expect(res.body[0].isSequel).toBe(true);
  });

  it('returns 503 when AniList 429s and retries are exhausted', async () => {
    // retry-after: 0 so setTimeout fires instantly with real timers
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (_: string) => '0' },
      }),
    );

    const res = await request(app).get('/api/anime?season=WINTER&year=2022');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('UPSTREAM_ERROR');
  }, 15000);
});
