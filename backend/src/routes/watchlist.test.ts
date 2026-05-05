import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { initDb, getDb } from '../db';
import { errorHandler } from '../middleware/errorHandler';
import watchlistRouter from './watchlist';
import authRouter from './auth';

function buildApp() {
  initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/watchlist', watchlistRouter);
  app.use(errorHandler);
  return app;
}

async function seedUser(username: string) {
  const hash = await bcrypt.hash('password123', 10);
  getDb().prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
}

describe('Watchlist API', () => {
  const app = buildApp();
  let aliceToken = '';
  let aliceId = 0;
  let bobId = 0;

  beforeAll(async () => {
    await seedUser('alice');
    await seedUser('bob');
    aliceId = (getDb().prepare("SELECT id FROM users WHERE username = 'alice'").get() as { id: number }).id;
    bobId = (getDb().prepare("SELECT id FROM users WHERE username = 'bob'").get() as { id: number }).id;
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'password123' });
    aliceToken = res.body.token;
  });

  const auth = () => ({ Authorization: `Bearer ${aliceToken}` });
  const qs = 'season=SPRING&year=2024';

  describe('POST /api/watchlist (add entry)', () => {
    it('adds an entry', async () => {
      const res = await request(app).post('/api/watchlist').set(auth()).send({ animeId: 100, season: 'SPRING', year: 2024 });
      expect(res.status).toBe(201);
    });

    it('is idempotent (same entry twice → 200)', async () => {
      const res = await request(app).post('/api/watchlist').set(auth()).send({ animeId: 100, season: 'SPRING', year: 2024 });
      expect(res.status).toBe(200);
    });

    it('rejects missing animeId', async () => {
      const res = await request(app).post('/api/watchlist').set(auth()).send({ season: 'SPRING', year: 2024 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/watchlist (own list)', () => {
    it('returns the entry just added', async () => {
      const res = await request(app).get(`/api/watchlist?${qs}`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].animeId).toBe(100);
      expect(res.body[0].watched).toBe(false);
      expect(res.body[0].hidden).toBe(false);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get(`/api/watchlist?${qs}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH watched', () => {
    it('toggles watched to true', async () => {
      const res = await request(app).patch(`/api/watchlist/100/watched?${qs}`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body.watched).toBe(true);
    });

    it('toggles watched back to false', async () => {
      const res = await request(app).patch(`/api/watchlist/100/watched?${qs}`).set(auth());
      expect(res.body.watched).toBe(false);
    });
  });

  describe('PATCH rank', () => {
    it('sets post-watch rank', async () => {
      const res = await request(app).patch(`/api/watchlist/100/rank?${qs}`).set(auth()).send({ rank: 0 });
      expect(res.status).toBe(200);
      const list = await request(app).get(`/api/watchlist?${qs}`).set(auth());
      expect(list.body[0].postWatchRank).toBe(0);
    });

    it('clears rank with null', async () => {
      await request(app).patch(`/api/watchlist/100/rank?${qs}`).set(auth()).send({ rank: null });
      const list = await request(app).get(`/api/watchlist?${qs}`).set(auth());
      expect(list.body[0].postWatchRank).toBeNull();
    });
  });

  describe('PATCH hidden', () => {
    it('toggles hidden to true', async () => {
      const res = await request(app).patch(`/api/watchlist/100/hidden?${qs}`).set(auth());
      expect(res.body.hidden).toBe(true);
    });
  });

  describe('PATCH nickname', () => {
    it('sets a nickname', async () => {
      await request(app).patch(`/api/watchlist/100/nickname?${qs}`).set(auth()).send({ nickname: 'My Fave' });
      const list = await request(app).get(`/api/watchlist?${qs}`).set(auth());
      expect(list.body[0].nickname).toBe('My Fave');
    });

    it('clears nickname with null', async () => {
      await request(app).patch(`/api/watchlist/100/nickname?${qs}`).set(auth()).send({ nickname: null });
      const list = await request(app).get(`/api/watchlist?${qs}`).set(auth());
      expect(list.body[0].nickname).toBeNull();
    });
  });

  describe('PUT /api/watchlist (bulk replace)', () => {
    it('replaces the whole list in order', async () => {
      const res = await request(app).put(`/api/watchlist?${qs}`).set(auth()).send([
        { animeId: 200, preWatchOrder: 0 },
        { animeId: 300, preWatchOrder: 1 },
      ]);
      expect(res.status).toBe(200);
      const list = await request(app).get(`/api/watchlist?${qs}`).set(auth());
      expect(list.body).toHaveLength(2);
      expect(list.body[0].animeId).toBe(200);
      expect(list.body[1].animeId).toBe(300);
    });
  });

  describe('DELETE /api/watchlist/:animeId', () => {
    it('removes an entry', async () => {
      await request(app).delete(`/api/watchlist/200?${qs}`).set(auth());
      const list = await request(app).get(`/api/watchlist?${qs}`).set(auth());
      expect(list.body).toHaveLength(1);
      expect(list.body[0].animeId).toBe(300);
    });
  });

  describe('GET /api/watchlist/user/:userId (public read)', () => {
    it("returns another user's entries without auth", async () => {
      // Seed bob's entry directly
      getDb().prepare('INSERT INTO watch_list_entries (user_id, anime_id, season, year) VALUES (?, ?, ?, ?)').run(bobId, 999, 'SPRING', 2024);
      const res = await request(app).get(`/api/watchlist/user/${bobId}?${qs}`);
      expect(res.status).toBe(200);
      expect(res.body[0].animeId).toBe(999);
    });
  });

  describe('GET /api/watchlist/anime/:animeId/nicknames (public read)', () => {
    it('returns nickname data for an anime across users', async () => {
      getDb().prepare("UPDATE watch_list_entries SET nickname = 'Cool Show' WHERE user_id = ? AND anime_id = 300").run(aliceId);
      const res = await request(app).get('/api/watchlist/anime/300/nicknames');
      expect(res.status).toBe(200);
      expect(res.body[0].username).toBe('alice');
      expect(res.body[0].nickname).toBe('Cool Show');
    });
  });
});
