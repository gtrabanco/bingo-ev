-- Group ownership moves from the browser-held admin secret (0007) to a member
-- CARD: the owner must be able to leave the room handing the office over, and
-- that only works if ownership names a card the server can reason about.
-- Owner-only actions (kick, delete) authenticate with the owner card's id +
-- secret. admin_secret stays as a dead column (never read again). Pre-0008
-- groups are ownerless: nobody moderates them, and they dissolve via the
-- opportunistic GC once abandoned.
ALTER TABLE groups ADD COLUMN owner_card_id TEXT;
