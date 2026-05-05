import express from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import { initDb, getDb } from './db';
import { generalLimiter, authLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import animeRouter from './routes/anime';
import settingsRouter from './routes/settings';
import watchlistRouter from './routes/watchlist';
import usersRouter from './routes/users';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const DB_PATH = process.env.DATABASE_PATH ?? './data/saltychart.db';

app.use(cors());
app.use(express.json());
app.use(generalLimiter);

app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/anime', animeRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/users', usersRouter);

// 404 for any unmatched /api/* route — prevents falling through to the SPA
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'BAD_REQUEST' });
});

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use(errorHandler);

async function seedAdmin(): Promise<void> {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (existing) return;

  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123';
  const hash = await bcrypt.hash(password, 10);
  db.prepare("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, 'admin')")
    .run(username, hash);
  console.log(`Admin user seeded: ${username}`);
}

if (require.main === module) {
  initDb(DB_PATH);
  seedAdmin().then(() => {
    app.listen(PORT, () => {
      console.log(`SaltyChart running on port ${PORT}`);
    });
  });
}

export { app };
