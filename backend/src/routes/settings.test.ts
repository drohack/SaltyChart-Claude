import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { initDb, getDb } from '../db';
import { errorHandler } from '../middleware/errorHandler';
import settingsRouter from './settings';
import authRouter from './auth';

function buildApp() {
  initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/settings', settingsRouter);
  app.use(errorHandler);
  return app;
}

describe('Settings API', () => {
  const app = buildApp();
  let token = '';

  beforeAll(async () => {
    const hash = await bcrypt.hash('password123', 10);
    getDb().prepare("INSERT INTO users (username, password_hash) VALUES ('alice', ?)").run(hash);
    const res = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'password123' });
    token = res.body.token;
  });

  it('GET returns defaults when no settings saved', async () => {
    const res = await request(app).get('/api/settings').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.theme).toBe('system');
    expect(res.body.titleLanguage).toBe('english');
    expect(res.body.autoplay).toBe(true);
    expect(res.body.hideFromCompare).toBe(false);
    expect(res.body.nicknameUserSelection).toEqual([]);
  });

  it('PUT creates settings and returns updated values', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark', titleLanguage: 'romaji', autoplay: false, hideFromCompare: true, nicknameUserSelection: [2, 3] });
    expect(res.status).toBe(200);
    expect(res.body.theme).toBe('dark');
    expect(res.body.titleLanguage).toBe('romaji');
    expect(res.body.autoplay).toBe(false);
    expect(res.body.hideFromCompare).toBe(true);
    expect(res.body.nicknameUserSelection).toEqual([2, 3]);
  });

  it('GET returns previously saved settings', async () => {
    const res = await request(app).get('/api/settings').set('Authorization', `Bearer ${token}`);
    expect(res.body.theme).toBe('dark');
    expect(res.body.nicknameUserSelection).toEqual([2, 3]);
  });

  it('PUT with partial body only updates those fields', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'light' });
    expect(res.body.theme).toBe('light');
    expect(res.body.titleLanguage).toBe('romaji'); // unchanged
  });

  it('PUT rejects invalid theme', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'rainbow' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });
});
