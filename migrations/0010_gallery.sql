-- Public gallery opt-out flag: 0 = listed (default), 1 = hidden by owner/operator.
-- Additive migration — safe on live data; default 0 lists all pre-existing completed
-- diplomas, which is the chosen opt-out behaviour (disclosed in /privacidad).
ALTER TABLE cards ADD COLUMN gallery_hidden INTEGER NOT NULL DEFAULT 0;
