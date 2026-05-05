import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { requireAuth } from '../middleware/auth';
import { publicLimiter } from '../middleware/rateLimit';
import { AppError } from '../errors';

const router = Router();

interface EntryRow {
  anime_id: number;
  season: string;
  year: number;
  nickname: string | null;
  pre_watch_order: number;
  watched: number;
  watched_at: string | null;
  post_watch_rank: number | null;
  hidden: number;
}

function rowToEntry(r: EntryRow) {
  return {
    animeId: r.anime_id,
    season: r.season,
    year: r.year,
    nickname: r.nickname,
    preWatchOrder: r.pre_watch_order,
    watched: !!r.watched,
    watchedAt: r.watched_at,
    postWatchRank: r.post_watch_rank,
    hidden: !!r.hidden,
  };
}

function seasonYear(req: Request): { season: string; year: number } {
  const { season, year } = req.query;
  if (typeof season !== 'string' || !['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(season)) {
    throw new AppError(400, 'BAD_REQUEST', 'season must be WINTER, SPRING, SUMMER, or FALL');
  }
  const y = Number(year);
  if (!year || isNaN(y) || y < 1900 || y > 2100) {
    throw new AppError(400, 'BAD_REQUEST', 'year must be a valid four-digit year');
  }
  return { season, year: y };
}

// ── Public read endpoints (must be defined before /:animeId routes) ───────────

router.get('/user/:userId', publicLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const userId = Number(req.params.userId);
    const db = getDb();
    const rows = db
      .prepare('SELECT anime_id, season, year, nickname, pre_watch_order, watched, watched_at, post_watch_rank, hidden FROM watch_list_entries WHERE user_id = ? AND season = ? AND year = ? ORDER BY pre_watch_order')
      .all(userId, season, year) as EntryRow[];
    res.json(rows.map(rowToEntry));
  } catch (err) {
    next(err);
  }
});

router.get('/anime/:animeId/nicknames', publicLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const animeId = Number(req.params.animeId);
    const db = getDb();
    const rows = db.prepare(`
      SELECT u.id AS userId, u.username, w.nickname, w.post_watch_rank AS postWatchRank, w.pre_watch_order AS preWatchOrder
      FROM watch_list_entries w
      JOIN users u ON u.id = w.user_id
      WHERE w.anime_id = ?
    `).all(animeId) as { userId: number; username: string; nickname: string | null; postWatchRank: number | null; preWatchOrder: number }[];
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── Authenticated own-list endpoints ─────────────────────────────────────────

router.get('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const db = getDb();
    const rows = db
      .prepare('SELECT anime_id, season, year, nickname, pre_watch_order, watched, watched_at, post_watch_rank, hidden FROM watch_list_entries WHERE user_id = ? AND season = ? AND year = ? ORDER BY pre_watch_order')
      .all(req.auth!.userId, season, year) as EntryRow[];
    res.json(rows.map(rowToEntry));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { animeId, season, year } = req.body as { animeId?: unknown; season?: unknown; year?: unknown };
    if (!animeId || typeof animeId !== 'number') throw new AppError(400, 'BAD_REQUEST', 'animeId must be a number');
    if (typeof season !== 'string' || !['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(season)) {
      throw new AppError(400, 'BAD_REQUEST', 'season must be WINTER, SPRING, SUMMER, or FALL');
    }
    const y = Number(year);
    if (!year || isNaN(y)) throw new AppError(400, 'BAD_REQUEST', 'year must be a valid number');

    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM watch_list_entries WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?')
      .get(req.auth!.userId, animeId, season, y);
    if (existing) { res.status(200).json({ ok: true }); return; }

    const maxOrder = (db.prepare('SELECT MAX(pre_watch_order) as m FROM watch_list_entries WHERE user_id = ? AND season = ? AND year = ?').get(req.auth!.userId, season, y) as { m: number | null }).m ?? -1;
    db.prepare('INSERT INTO watch_list_entries (user_id, anime_id, season, year, pre_watch_order) VALUES (?, ?, ?, ?, ?)').run(req.auth!.userId, animeId, season, y, maxOrder + 1);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const entries = req.body as { animeId: number; nickname?: string | null; preWatchOrder?: number }[];
    if (!Array.isArray(entries)) throw new AppError(400, 'BAD_REQUEST', 'body must be an array');

    const db = getDb();
    const replace = db.transaction(() => {
      db.prepare('DELETE FROM watch_list_entries WHERE user_id = ? AND season = ? AND year = ?').run(req.auth!.userId, season, year);
      const insert = db.prepare('INSERT INTO watch_list_entries (user_id, anime_id, season, year, nickname, pre_watch_order) VALUES (?, ?, ?, ?, ?, ?)');
      entries.forEach((e, i) => insert.run(req.auth!.userId, e.animeId, season, year, e.nickname ?? null, e.preWatchOrder ?? i));
    });
    replace();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:animeId', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const animeId = Number(req.params.animeId);
    getDb().prepare('DELETE FROM watch_list_entries WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?').run(req.auth!.userId, animeId, season, year);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:animeId/watched', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const animeId = Number(req.params.animeId);
    const db = getDb();
    const row = db
      .prepare('SELECT watched FROM watch_list_entries WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?')
      .get(req.auth!.userId, animeId, season, year) as { watched: number } | undefined;
    if (!row) throw new AppError(404, 'USER_NOT_FOUND', 'Entry not found');
    const nowWatched = !row.watched;
    db.prepare('UPDATE watch_list_entries SET watched = ?, watched_at = ? WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?')
      .run(nowWatched ? 1 : 0, nowWatched ? new Date().toISOString() : null, req.auth!.userId, animeId, season, year);
    res.json({ watched: nowWatched });
  } catch (err) {
    next(err);
  }
});

router.patch('/:animeId/rank', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const animeId = Number(req.params.animeId);
    const { rank } = req.body as { rank?: unknown };
    if (rank !== null && rank !== undefined && typeof rank !== 'number') {
      throw new AppError(400, 'BAD_REQUEST', 'rank must be a number or null');
    }
    getDb().prepare('UPDATE watch_list_entries SET post_watch_rank = ? WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?')
      .run(rank ?? null, req.auth!.userId, animeId, season, year);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:animeId/hidden', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const animeId = Number(req.params.animeId);
    const db = getDb();
    const row = db
      .prepare('SELECT hidden FROM watch_list_entries WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?')
      .get(req.auth!.userId, animeId, season, year) as { hidden: number } | undefined;
    if (!row) throw new AppError(404, 'USER_NOT_FOUND', 'Entry not found');
    const nowHidden = !row.hidden;
    db.prepare('UPDATE watch_list_entries SET hidden = ? WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?')
      .run(nowHidden ? 1 : 0, req.auth!.userId, animeId, season, year);
    res.json({ hidden: nowHidden });
  } catch (err) {
    next(err);
  }
});

router.patch('/:animeId/nickname', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { season, year } = seasonYear(req);
    const animeId = Number(req.params.animeId);
    const { nickname } = req.body as { nickname?: unknown };
    if (nickname !== null && nickname !== undefined && typeof nickname !== 'string') {
      throw new AppError(400, 'BAD_REQUEST', 'nickname must be a string or null');
    }
    getDb().prepare('UPDATE watch_list_entries SET nickname = ? WHERE user_id = ? AND anime_id = ? AND season = ? AND year = ?')
      .run(nickname ?? null, req.auth!.userId, animeId, season, year);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
