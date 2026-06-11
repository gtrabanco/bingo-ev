-- Group admin: the creator receives an admin secret at creation time, kept in
-- their browser (evbingo.groupAdmin.<id>). It moderates the group — kicking
-- members — and is deliberately NOT tied to a card: cards are ephemeral
-- (regenerated, expired), admin rights are not. Groups created before this
-- migration simply have no admin (NULL): nobody can kick there.
ALTER TABLE groups ADD COLUMN admin_secret TEXT;
