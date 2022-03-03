BEGIN;
-------------------------------------------------------------------------------

PRAGMA user_version = 3;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Add the 'external' column to entry types. This means that entries of this
-- type are not in the entries table but are manufactured at run time
-------------------------------------------------------------------------------

ALTER TABLE entryTypes ADD COLUMN external INTEGER;

-------------------------------------------------------------------------------
-- Add a category column for entry types, in order to group them
-------------------------------------------------------------------------------

ALTER TABLE entryTypes ADD COLUMN category TEXT;

-------------------------------------------------------------------------------
-- Now, update categories for the existing entry types
-------------------------------------------------------------------------------

UPDATE entryTypes SET category = 'Journals'
WHERE entryTypeId IN (1, 2, 3);

UPDATE entryTypes SET category = 'Events'
WHERE entryTypeId IN (4, 5);

UPDATE entryTypes SET category = 'Parameters'
WHERE entryTypeId IN (6, 7, 8, 9, 10, 11);

-------------------------------------------------------------------------------
-- Add new entry types for livestock
-------------------------------------------------------------------------------

INSERT INTO entryTypes (entryTypeId, name, color, external, category) VALUES
    (12, 'Coral', 'light-green lighten-5', 1, 'Livestock');

INSERT INTO entryTypes (entryTypeId, name, color, external, category) VALUES
    (13, 'Fish', 'teal lighten-5', 1, 'Livestock');

INSERT INTO entryTypes (entryTypeId, name, color, external, category) VALUES
    (14, 'Inverts', 'deep-orange lighten-5', 1, 'Livestock');

-------------------------------------------------------------------------------

COMMIT;
