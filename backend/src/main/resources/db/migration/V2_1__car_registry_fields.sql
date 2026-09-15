-- Replaces the employee-parking car fields (owner_name, employee_id, phone_number,
-- notes) with a vehicle-registry shape: chassis number becomes the primary key,
-- plus license plate, car type, client name, and delivery date.

ALTER TABLE cars DROP CONSTRAINT chk_car_id_length;
ALTER TABLE cars RENAME COLUMN id TO chassis_number;
ALTER TABLE cars ALTER COLUMN chassis_number TYPE VARCHAR(50);

ALTER TABLE cars
  ADD COLUMN license_plate_number VARCHAR(20),
  ADD COLUMN car_type VARCHAR(50),
  ADD COLUMN client_name VARCHAR(100),
  ADD COLUMN delivery_date DATE;

-- Backfill any pre-existing rows so the NOT NULL constraints below can be applied.
UPDATE cars SET
  license_plate_number = COALESCE(license_plate_number, chassis_number),
  car_type = COALESCE(car_type, 'UNKNOWN'),
  client_name = COALESCE(client_name, owner_name);

ALTER TABLE cars
  ALTER COLUMN license_plate_number SET NOT NULL,
  ALTER COLUMN car_type SET NOT NULL,
  ALTER COLUMN client_name SET NOT NULL;

ALTER TABLE cars
  DROP COLUMN owner_name,
  DROP COLUMN employee_id,
  DROP COLUMN phone_number,
  DROP COLUMN notes;
