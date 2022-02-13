BEGIN;

PRAGMA user_version = 9;

-- Add the tankId to the frags table

ALTER TABLE frags ADD COLUMN tankId INTEGER;

COMMIT;
