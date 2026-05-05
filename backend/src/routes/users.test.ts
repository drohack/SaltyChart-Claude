import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { initDb, getDb } from '../db';
import { errorHandler } from '../middleware/errorHandler';
import usersRouter from './users';
import settingsRouter from './settings';
import authRouter from './auth';

function buildApp() {
  initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/users', usersRouter);
  app.use(errorHandler);
  return app;
}

describe('Users API', () => {
  const app = buildApp();
  let aliceId = 0;
  let aliceToken = '';

  beforeAll(async () => {
    const db = getDb();
    const hash = await bcrypt.hash('password123', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('alice', hash);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('bob', hash);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('carol', hash);
    aliceId = (db.prepare("SELECT id FROM users WHERE username = 'alice'").get() as { id: number }).id;
    const bobId = (db.prepare("SELECT id FROM users WHERE username = 'bob'").get() as { id: number }).id;
    const carolId = (db.prepare("SELECT id FROM users WHERE username = 'carol'").get() as { id: number }).id;

    // bob hides from compare
    db.prepare('INSERT INTO user_settings (user_id, hide_from_compare) VALUES (?, 1)').run(bobId);
    // carol has a watchlist entry with a nickname
    db.prepare("INSERT INTO watch_list_entries (user_id, anime_id, season, year, nickname) VALUES (?, 500, 'FALL', 2023, 'My Show')").run(carolId);
    // alice has a watchlist entry without nickname
    db.prepare("INSERT INTO watch_list_entries (user_id, anime_id, season, year) VALUES (?, 600, 'FALL', 2023)").run(aliceId);

    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'password123' });
    aliceToken = res.body.token;
  });

  describe('GET /api/users', () => {
    it('returns users excluding those who hide from compare', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      const names = res.body.map((u: { username: string }) => u.username);
      expect(names).toContain('alice');
      expect(names).toContain('carol');
      expect(names).not.toContain('bob');
    });
  });

  describe('GET /api/users/with-season', () => {
    it('returns users with entries for that season/year', async () => {
      const res = await request(app).get('/api/users/with-season?season=FALL&year=2023');
      expect(res.status).toBe(200);
      const names = res.body.map((u: { username: string }) => u.username);
      expect(names).toContain('alice');
      expect(names).toContain('carol');
    });

    it('returns empty array for a season nobody has', async () => {
      const res = await request(app).get('/api/users/with-season?season=WINTER&year=2020');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /api/users/with-nicknames', () => {
    it('returns only users who have at least one custom nickname', async () => {
      const res = await request(app).get('/api/users/with-nicknames');
      expect(res.status).toBe(200);
      const names = res.body.map((u: { username: string }) => u.username);
      expect(names).toContain('carol');
      expect(names).not.toContain('alice'); // alice has no nickname
    });
  });

  describe('Settings hideFromCompare', () => {
    it('alice sets hideFromCompare=true and disappears from /api/users', async () => {
      await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ hideFromCompare: true });

      const res = await request(app).get('/api/users');
      const names = res.body.map((u: { username: string }) => u.username);
      expect(names).not.toContain('alice');
    });
  });
});
