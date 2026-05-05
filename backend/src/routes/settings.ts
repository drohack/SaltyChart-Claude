import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../errors';

const router = Router();

const VALID_THEMES = new Set(['light', 'dark', 'system', 'high-contrast']);
const VALID_TITLE_LANGS = new Set(['english', 'romaji', 'native']);

interface SettingsRow {
  theme: string;
  title_language: string;
  autoplay: number;
  hide_from_compare: number;
  nickname_user_selection: string;
}

function rowToSettings(row: SettingsRow | undefined) {
  return {
    theme: row?.theme ?? 'system',
    titleLanguage: row?.title_language ?? 'english',
    autoplay: row ? !!row.autoplay : true,
    hideFromCompare: row ? !!row.hide_from_compare : false,
    nicknameUserSelection: row ? (JSON.parse(row.nickname_user_selection) as number[]) : [],
  };
}

router.get('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const row = db
      .prepare('SELECT theme, title_language, autoplay, hide_from_compare, nickname_user_selection FROM user_settings WHERE user_id = ?')
      .get(req.auth!.userId) as SettingsRow | undefined;
    res.json(rowToSettings(row));
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { theme, titleLanguage, autoplay, hideFromCompare, nicknameUserSelection } =
      req.body as Record<string, unknown>;

    if (theme !== undefined && (typeof theme !== 'string' || !VALID_THEMES.has(theme))) {
      throw new AppError(400, 'BAD_REQUEST', `theme must be one of: ${[...VALID_THEMES].join(', ')}`);
    }
    if (titleLanguage !== undefined && (typeof titleLanguage !== 'string' || !VALID_TITLE_LANGS.has(titleLanguage))) {
      throw new AppError(400, 'BAD_REQUEST', `titleLanguage must be one of: ${[...VALID_TITLE_LANGS].join(', ')}`);
    }
    if (nicknameUserSelection !== undefined && !Array.isArray(nicknameUserSelection)) {
      throw new AppError(400, 'BAD_REQUEST', 'nicknameUserSelection must be an array');
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM user_settings WHERE user_id = ?')
      .get(req.auth!.userId);

    if (!existing) {
      db.prepare(`
        INSERT INTO user_settings (user_id, theme, title_language, autoplay, hide_from_compare, nickname_user_selection)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        req.auth!.userId,
        theme ?? 'system',
        titleLanguage ?? 'english',
        autoplay !== undefined ? (autoplay ? 1 : 0) : 1,
        hideFromCompare !== undefined ? (hideFromCompare ? 1 : 0) : 0,
        JSON.stringify(nicknameUserSelection ?? []),
      );
    } else {
      const fields: string[] = [];
      const values: unknown[] = [];
      if (theme !== undefined) { fields.push('theme = ?'); values.push(theme); }
      if (titleLanguage !== undefined) { fields.push('title_language = ?'); values.push(titleLanguage); }
      if (autoplay !== undefined) { fields.push('autoplay = ?'); values.push(autoplay ? 1 : 0); }
      if (hideFromCompare !== undefined) { fields.push('hide_from_compare = ?'); values.push(hideFromCompare ? 1 : 0); }
      if (nicknameUserSelection !== undefined) { fields.push('nickname_user_selection = ?'); values.push(JSON.stringify(nicknameUserSelection)); }
      if (fields.length > 0) {
        values.push(req.auth!.userId);
        db.prepare(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);
      }
    }

    const updated = db
      .prepare('SELECT theme, title_language, autoplay, hide_from_compare, nickname_user_selection FROM user_settings WHERE user_id = ?')
      .get(req.auth!.userId) as SettingsRow | undefined;
    res.json(rowToSettings(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
