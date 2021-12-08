BEGIN;

PRAGMA user_version = 3;

-- Add the date that the user is done to the queue

ALTER TABLE queue ADD COLUMN dateDone TEXT;

COMMIT;
