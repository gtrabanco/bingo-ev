-- Optional email link so a player can recover their card from another device.
-- No auth: ownership is proven by receiving the recovery email itself, which
-- carries the card's owner link (id + secret). `newsletter` records the opt-in
-- to Gabriel Trabanco's Brevo list at link time.
ALTER TABLE cards ADD COLUMN email TEXT;
ALTER TABLE cards ADD COLUMN newsletter INTEGER NOT NULL DEFAULT 0;

-- Recovery looks cards up by email.
CREATE INDEX IF NOT EXISTS idx_cards_email ON cards (email) WHERE email IS NOT NULL;
