-- Bingo groups: several cards compete, only the FIRST completion wins. The
-- winner is fixed atomically on the group row; later completions still earn
-- their diploma, just not the glory.
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  winner_card_id TEXT
);

ALTER TABLE cards ADD COLUMN group_id TEXT;

CREATE INDEX IF NOT EXISTS idx_cards_group ON cards (group_id) WHERE group_id IS NOT NULL;
