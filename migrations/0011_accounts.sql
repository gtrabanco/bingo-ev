-- Optional durable identity substrate (feature 05-accounts).
-- All additions are additive and safe on live data.

CREATE TABLE accounts (
  id               TEXT PRIMARY KEY,
  provider         TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email            TEXT,
  display_name     TEXT,
  created_at       TEXT NOT NULL,
  UNIQUE (provider, provider_user_id)
);

-- Only the SHA-256 hash of the cookie token is stored; the raw token cannot
-- be reconstructed from the DB, limiting exposure if the DB is read.
CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

-- Single-use PKCE state; consumed (DELETED) on callback.
CREATE TABLE oauth_state (
  state         TEXT PRIMARY KEY,
  provider      TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Nullable: null = card not linked to any account.
ALTER TABLE cards ADD COLUMN account_id TEXT;
