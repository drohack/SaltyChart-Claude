CREATE TABLE IF NOT EXISTS season_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season TEXT NOT NULL,
  year INTEGER NOT NULL,
  payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (season, year)
);

CREATE INDEX IF NOT EXISTS idx_season_cache_key ON season_cache (season, year);
