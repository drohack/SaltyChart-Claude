import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/', publicLimiter, (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT u.id, u.username
      FROM users u
      LEFT JOIN user_settings s ON s.user_id = u.id
      WHERE s.hide_from_compare IS NULL OR s.hide_from_compare = 0
      ORDER BY u.username COLLATE NOCASE
    `).all() as { id: number; username: string }[];
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/with-season', publicLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = req.query;
    const db = getDb();
    const rows = db.prepare(`
      SELECT DISTINCT u.id, u.username
      FROM users u
      JOIN watch_list_entries w ON w.user_id = u.id
      WHERE w.season = ? AND w.year = ?
      ORDER BY u.username COLLATE NOCASE
    `).all(season as string, Number(year)) as { id: number; username: string }[];
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/with-nicknames', publicLimiter, (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT DISTINCT u.id, u.username
      FROM users u
      JOIN watch_list_entries w ON w.user_id = u.id
      WHERE w.nickname IS NOT NULL AND w.nickname != ''
      ORDER BY u.username COLLATE NOCASE
    `).all() as { id: number; username: string }[];
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
