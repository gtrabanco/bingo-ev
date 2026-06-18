ALTER TABLE accounts ADD COLUMN public_handle TEXT;
ALTER TABLE accounts ADD COLUMN profile_public INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_accounts_public_handle ON accounts (public_handle);
