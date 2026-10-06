CREATE TABLE IF NOT EXISTS picks (
  name_key   TEXT PRIMARY KEY,  -- lower-cased name, so "jamie" and "Jamie" are one person
  name       TEXT NOT NULL,
  picks      TEXT NOT NULL,     -- JSON array of desk IDs, best first
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  name TEXT PRIMARY KEY,
  days INTEGER NOT NULL DEFAULT 0
);
