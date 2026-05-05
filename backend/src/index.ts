import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import healthRouter from './routes/health';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const DB_PATH = process.env.DATABASE_PATH ?? './data/saltychart.db';

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

if (require.main === module) {
  initDb(DB_PATH);
  app.listen(PORT, () => {
    console.log(`SaltyChart running on port ${PORT}`);
  });
}

export { app };
