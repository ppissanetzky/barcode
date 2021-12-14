BEGIN;

PRAGMA user_version = 4;

-- A table of users that are allowed to hold equipment

CREATE TABLE holders (
    userId      INTEGER NOT NULL PRIMARY KEY,
    -- Should be one of the locations in places.json
    location    TEXT NOT NULL
);

-- wlachnit
INSERT INTO holders VALUES (13604, 'Pleasanton');
-- jvu
INSERT INTO holders VALUES (14245, 'Walnut Creek');
-- svreef
INSERT INTO holders VALUES (15211, 'Scotts Valley');
-- ioncewaslegend
INSERT INTO holders VALUES (15417, 'San Jose');
-- srt4eric
INSERT INTO holders VALUES (15797, 'San Jose');
-- rygh
INSERT INTO holders VALUES (911, 'Union City');
-- coral reefer
INSERT INTO holders VALUES (803, 'San Francisco');
-- sfsuphysics
INSERT INTO holders VALUES (105, 'San Francisco');
-- chromis
INSERT INTO holders VALUES (14129, 'Mountain View');
-- blaise006
INSERT INTO holders VALUES (15610, 'San Jose');
-- h2oplayar
INSERT INTO holders VALUES (16423, 'Sunnyvale');

COMMIT;
