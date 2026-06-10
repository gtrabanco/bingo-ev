-- Live-shareable cards: the layout (cells) and marks live server-side so
-- /c/<id> can render a read-only view. `secret` is the owner token issued at
-- creation — mutations require it, so a shared link can watch but not touch.
ALTER TABLE cards ADD COLUMN secret TEXT;
ALTER TABLE cards ADD COLUMN cells TEXT;
ALTER TABLE cards ADD COLUMN marks TEXT;
