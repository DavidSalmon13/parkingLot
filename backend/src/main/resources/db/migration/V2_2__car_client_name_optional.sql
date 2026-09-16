-- Client name is now optional when registering or editing a car.
ALTER TABLE cars ALTER COLUMN client_name DROP NOT NULL;
