-- Pull-direction device transfer (feature 12-bidirectional-device-transfer).
-- A card-less device creates an empty slot and polls it; a card-holding device
-- deposits its card id into the slot; the opener adopts that card.
-- GC is opportunistic: batched into the create call (see /api/receive-slot).
CREATE TABLE receive_slots (
  code           TEXT PRIMARY KEY,   -- same alphabet/format as device_codes
  result_card_id TEXT,               -- null = pending; set once a scanner deposits
  created_at     TEXT NOT NULL,
  expires_at     TEXT NOT NULL,
  consumed_at    TEXT                -- null = available; set when generator claims result
);
