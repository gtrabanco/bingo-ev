-- Ephemeral device-code table for cross-device card transfer (feature 05-accounts P7).
-- Codes expire after 5 minutes and are single-use (consumed_at IS NULL = available).
-- GC is opportunistic: batched into the create call (see /api/cards/:id/device-code).
CREATE TABLE device_codes (
  code        TEXT PRIMARY KEY,
  card_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT           -- null = available; set = consumed
);
