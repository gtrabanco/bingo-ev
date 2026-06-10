-- Group settings: unique names, a join policy (open link vs password) and a
-- board-visibility flag (public standings vs members-only). Plus a per-card
-- alias, mandatory to take part in a group and shown in the standings.
ALTER TABLE groups ADD COLUMN join_policy TEXT NOT NULL DEFAULT 'open';
ALTER TABLE groups ADD COLUMN password_hash TEXT;
ALTER TABLE groups ADD COLUMN public_board INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cards ADD COLUMN alias TEXT;

-- Group names must be unique (case-insensitively). The share link still uses
-- the random id; this just stops two groups sharing a human name.
--
-- The previous create endpoint defaulted unnamed groups to "Bingo sin nombre",
-- so older data may hold duplicates. Disambiguate them (keep the oldest as-is,
-- suffix the rest with their id) before the index, so the migration can't fail
-- on pre-existing clashes. The UPDATE is a no-op when there are none.
UPDATE groups
SET name = name || ' ' || id
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY name COLLATE NOCASE ORDER BY created_at, id) AS rn
    FROM groups
  )
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name ON groups (name COLLATE NOCASE);
