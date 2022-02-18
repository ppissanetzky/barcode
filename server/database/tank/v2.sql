BEGIN;
-------------------------------------------------------------------------------

PRAGMA user_version = 2;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Entry types
-------------------------------------------------------------------------------

CREATE TABLE entryTypes (
    entryTypeId             INTEGER PRIMARY KEY,
    name                    TEXT NOT NULL,
    color                   TEXT,

    hasValue                INTEGER,    -- Wether it has a value
    isTracked               INTEGER,    -- Wether it is a tracked parameter
    format                  TEXT,       -- The format for values
    units                   TEXT,       -- Units
    min                     REAL,       -- The minimum allowable value
    max                     REAL,       -- The maximum allowable value
    low                     REAL,       -- Subjective low value
    high                    REAL        -- Subjective hight value
);

INSERT INTO entryTypes (entryTypeId, name, color) VALUES
    (1, 'Note', 'brown lighten-5');
INSERT INTO entryTypes (entryTypeId, name, color) VALUES
    (2, 'Good', 'green lighten-5');
INSERT INTO entryTypes (entryTypeId, name, color) VALUES
    (3, 'Bad', 'red lighten-5');
INSERT INTO entryTypes (entryTypeId, name, color) VALUES
    (4, 'Maintenance', 'blue-grey lighten-5');

INSERT INTO entryTypes (entryTypeId, name, color, hasValue, format, units) VALUES
    (5, 'Water change', 'light-blue lighten-5', 1, '0', 'Gallons');

INSERT INTO entryTypes (entryTypeId, name, color, hasValue, isTracked, format, units) VALUES
    (6, 'Alk', 'deep-purple lighten-5', 1, 1, '0.00', 'dKH');

INSERT INTO entryTypes (entryTypeId, name, color, hasValue, isTracked, format, units) VALUES
    (7, 'Ca', 'purple lighten-5', 1, 1, '0', 'ppm');

INSERT INTO entryTypes (entryTypeId, name, color, hasValue, isTracked, format, units) VALUES
    (8, 'Mg', 'indigo lighten-5', 1, 1, '0', 'ppm');

INSERT INTO entryTypes (entryTypeId, name, color, hasValue, isTracked, format, units) VALUES
    (9, 'NO' || CHAR(0x2083), 'orange lighten-5', 1, 1, '0.00', 'ppm');

INSERT INTO entryTypes (entryTypeId, name, color, hasValue, isTracked, format, units) VALUES
    (10, 'PO' || CHAR(0x2084), 'cyan lighten-5', 1, 1, '0.00', 'ppm');

INSERT INTO entryTypes (entryTypeId, name, color, hasValue, isTracked, format, units) VALUES
    (11, 'SG', 'amber lighten-5', 1, 1, '0.000', '');

-------------------------------------------------------------------------------
-- Entries
-------------------------------------------------------------------------------

CREATE TABLE entries (
    tankId                  INTEGER NOT NULL,
    entryTypeId             INTEGER NOT NULL,
    time                    INTEGER NOT NULL,
    value                   REAL,
    comment                 TEXT,
    isPrivate               INTEGER,

    FOREIGN KEY (tankId) REFERENCES tanks (tankId),
    FOREIGN KEY (entryTypeId) REFERENCES entryTypes (entryTypeId)
);

CREATE INDEX entriesTankId ON entries(tankId);
CREATE INDEX entriesEntryType ON entries(entryTypeId);

-------------------------------------------------------------------------------

DROP TABLE journals;

-------------------------------------------------------------------------------

COMMIT;
