import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDb } from '../db';
import { requireAuth } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import authRouter from './auth';

function buildApp() {
  initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/api/protected', requireAuth, (req, res) => {
    res.json({ userId: req.auth!.userId, username: req.auth!.username });
  });
  app.use(errorHandler);
  return app;
}

describe('Auth API', () => {
  const app = buildApp();
  let token = '';

  describe('POST /api/auth/signup', () => {
    it('creates a user and returns a token', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'alice', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.username).toBe('alice');
      expect(res.body.role).toBe('user');
      token = res.body.token;
    });

    it('rejects duplicate username (case-insensitive)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'ALICE', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('USER_EXISTS');
    });

    it('rejects username shorter than 2 chars', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'x', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('rejects password shorter than 8 chars', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'bob', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.username).toBe('alice');
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects unknown user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('requireAuth middleware', () => {
    it('rejects requests with no token', async () => {
      const res = await request(app).get('/api/protected');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with a bad token', async () => {
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer notavalidtoken');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('allows requests with a valid token', async () => {
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('alice');
    });
  });
});
