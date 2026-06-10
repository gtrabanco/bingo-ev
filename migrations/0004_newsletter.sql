-- Newsletter sign-ups, kept separate from cards so the list can later be
-- consolidated across Gabriel's sites. `source` records the origin domain so
-- a future merge knows where each address came from. GDPR: consent is the
-- lawful basis; `consented_at` is the timestamp of the explicit opt-in.
CREATE TABLE IF NOT EXISTS newsletter (
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  PRIMARY KEY (email, source)
);
