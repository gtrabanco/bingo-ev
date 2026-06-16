-- Add optional vehicle type to cards: BEV brand, PHEV, ICE, or NULL (skipped).
-- Additive migration — safe on live data, no backfill required.
ALTER TABLE cards ADD COLUMN vehicle_type TEXT
  CHECK(vehicle_type IN (
    'bev_tesla','bev_renault','bev_vw','bev_hyundai','bev_kia','bev_byd',
    'bev_cupra','bev_peugeot','bev_nissan','bev_bmw','bev_audi',
    'bev_mercedes','bev_volvo','bev_other',
    'phev','ice'
  )) DEFAULT NULL;
