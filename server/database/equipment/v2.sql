BEGIN;

PRAGMA user_version = 2;

-- Add the location to the queue table

ALTER TABLE queue ADD COLUMN location TEXT;

COMMIT;