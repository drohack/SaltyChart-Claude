import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDb } from '../db';
import healthRouter from './health';

function buildApp() {
  initDb(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/health', healthRouter);
  return app;
}

describe('GET /api/health', () => {
  const app = buildApp();

  it('returns 200 with ok:true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.ts).toBe('number');
  });
});
