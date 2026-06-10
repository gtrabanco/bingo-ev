-- One tiny table. Cards register on creation; completed_at/nick fill in on a
-- valid completion. Expired or regenerated cards are deleted (only completed
-- cards persist long-term, so the table stays small).
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  nick TEXT
);

-- Speeds up the opportunistic sweep of expired, never-completed cards.
CREATE INDEX IF NOT EXISTS idx_cards_pending
  ON cards (created_at)
  WHERE completed_at IS NULL;
