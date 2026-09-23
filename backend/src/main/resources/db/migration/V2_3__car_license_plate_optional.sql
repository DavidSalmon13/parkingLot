-- License plate number is now optional when registering or editing a car.
ALTER TABLE cars ALTER COLUMN license_plate_number DROP NOT NULL;
