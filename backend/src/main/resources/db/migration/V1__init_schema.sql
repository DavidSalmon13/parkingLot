CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE parking_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  row_labels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_parking_lots_name_ci ON parking_lots (LOWER(name));

CREATE TABLE parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE RESTRICT,
  label VARCHAR(20) NOT NULL,
  row_label VARCHAR(10) NOT NULL,
  position INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_parking_spots_lot_label ON parking_spots (lot_id, label);

CREATE TABLE cars (
  id VARCHAR(6) PRIMARY KEY,
  owner_name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  phone_number VARCHAR(30),
  notes VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cars ADD CONSTRAINT chk_car_id_length CHECK (length(id) = 6);

CREATE TABLE car_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id VARCHAR(6) NOT NULL REFERENCES cars(id),
  spot_id UUID NOT NULL REFERENCES parking_spots(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  created_by_user_id UUID,
  removed_by_user_id UUID
);
