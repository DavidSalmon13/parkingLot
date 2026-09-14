-- Partial unique indexes are the DB-level guarantee against the
-- concurrent-assignment race conditions (spec §7.5/§7.6): only one active
-- (removed_at IS NULL) assignment can exist per spot, and per car, ever.
CREATE UNIQUE INDEX uq_car_assignments_active_spot
  ON car_assignments (spot_id) WHERE removed_at IS NULL;
CREATE UNIQUE INDEX uq_car_assignments_active_car
  ON car_assignments (car_id) WHERE removed_at IS NULL;

CREATE INDEX idx_car_assignments_car_id ON car_assignments (car_id);
CREATE INDEX idx_car_assignments_spot_id ON car_assignments (spot_id);
