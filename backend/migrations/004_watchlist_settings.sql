CREATE TABLE IF NOT EXISTS watch_list_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  year INTEGER NOT NULL,
  nickname TEXT,
  pre_watch_order INTEGER NOT NULL DEFAULT 0,
  watched INTEGER NOT NULL DEFAULT 0,
  watched_at TEXT,
  post_watch_rank INTEGER,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, anime_id, season, year)
);

CREATE INDEX IF NOT EXISTS idx_wle_user ON watch_list_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_wle_season ON watch_list_entries (season, year);

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  title_language TEXT NOT NULL DEFAULT 'english',
  autoplay INTEGER NOT NULL DEFAULT 1,
  hide_from_compare INTEGER NOT NULL DEFAULT 0,
  nickname_user_selection TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_settings_hide ON user_settings (hide_from_compare);
