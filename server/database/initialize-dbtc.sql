
-- ----------------------------------------------------------------------------
-- RUNNING THIS SCRIPT DELETES ALL EXISTING DATA
-- ----------------------------------------------------------------------------

DELETE FROM fans;
DELETE FROM journals;
DELETE FROM frags;
DELETE FROM mothers;

-- ----------------------------------------------------------------------------
-- TEST USERS
-- ----------------------------------------------------------------------------
-- 16186 - barcode1
-- 16188 - barcode2
-- 16189 - barcode3
-- 16190 - barcode4

-- ----------------------------------------------------------------------------
-- Hammer
-- ----------------------------------------------------------------------------

INSERT INTO mothers (name, type)
    VALUES ('Indo Hammer', 'LPS');

-- One with frags available

INSERT INTO frags (motherId, ownerId, dateAcquired, fragsAvailable)
    VALUES (1, 16186, '2020-05-16', 3);

-- ----------------------------------------------------------------------------
-- Another one
-- ----------------------------------------------------------------------------

INSERT INTO mothers (name, type)
    VALUES ('BC Pink Tip Sarmentosa', 'SPS');

-- The original with no frags available

INSERT INTO frags (motherId, ownerId, dateAcquired)
    VALUES (2, 16186, '2020-12-06');

-- A frag given to rygh

INSERT INTO frags (motherId, ownerId, dateAcquired, fragOf)
    VALUES (2, 16188, '2020-12-10', 2);

-- ----------------------------------------------------------------------------
-- Another species
-- ----------------------------------------------------------------------------

INSERT INTO mothers (name, type)
    VALUES ('Bubblegum Digi', 'SPS');

-- A dead frag

INSERT INTO frags (motherId, ownerId, dateAcquired, isAlive)
    VALUES (3, 16186, '2020-11-01', 0);

-- A journal

INSERT INTO journals (fragId, entryType, notes)
    VALUES (1, 'TEST', 'Notes here');