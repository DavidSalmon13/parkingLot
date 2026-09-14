-- Dev-only seed data: 5 lots x 60 spots (300 spots total, spec §8's target scale)
-- with roughly a third of spots occupied, for local load/perf testing.
-- Only applied under the "dev" Spring profile (see application-dev.yml's extra
-- spring.flyway.locations) -- never runs against a real deployment.

DO $$
DECLARE
  lot_names CONSTANT text[] := ARRAY['North Garage', 'South Deck', 'East Lot', 'West Lot', 'Central Garage'];
  row_letters CONSTANT text[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F'];
  lot_name text;
  new_lot_id uuid;
  row_letter text;
  pos int;
  new_spot_id uuid;
  spot_counter int := 0;
  new_car_id text;
BEGIN
  FOREACH lot_name IN ARRAY lot_names LOOP
    INSERT INTO parking_lots (id, name, row_labels)
    VALUES (gen_random_uuid(), lot_name, row_letters)
    RETURNING id INTO new_lot_id;

    FOREACH row_letter IN ARRAY row_letters LOOP
      FOR pos IN 1..10 LOOP
        spot_counter := spot_counter + 1;
        INSERT INTO parking_spots (id, lot_id, label, row_label, position)
        VALUES (gen_random_uuid(), new_lot_id, row_letter || pos, row_letter, pos)
        RETURNING id INTO new_spot_id;

        -- Occupy roughly every third spot with a distinct car for a realistic mixed dashboard.
        IF spot_counter % 3 = 0 THEN
          new_car_id := 'DEV' || lpad(spot_counter::text, 3, '0');
          INSERT INTO cars (id, owner_name, employee_id, phone_number, notes)
          VALUES (new_car_id, 'Seed Owner ' || spot_counter, 'E' || lpad(spot_counter::text, 4, '0'), NULL, NULL);
          INSERT INTO car_assignments (id, car_id, spot_id)
          VALUES (gen_random_uuid(), new_car_id, new_spot_id);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
