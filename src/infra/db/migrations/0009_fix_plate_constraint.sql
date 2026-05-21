-- Fix plate format check constraint: d{1,2} → [0-9]{1,2}
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS chk_plate_format;
ALTER TABLE vehicles ADD CONSTRAINT chk_plate_format
  CHECK (plate_no ~ '^[0-9]{1,2}-[A-Z]-[0-9]{3,4}$');
