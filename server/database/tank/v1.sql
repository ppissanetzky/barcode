BEGIN;
-------------------------------------------------------------------------------

PRAGMA user_version = 1;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Tanks table
-------------------------------------------------------------------------------

CREATE TABLE tanks (
    tankId                  INTEGER PRIMARY KEY,
    userId                  INTEGER NOT NULL,
    name                    TEXT NOT NULL,
    model                   TEXT,
    dimensions              TEXT,
    displayVolume           INTEGER NOT NULL,
    totalVolume             INTEGER NOT NULL,
    dateStarted             TEXT NOT NULL,
    description             TEXT,
    threadId                INTEGER
);

-------------------------------------------------------------------------------
-- Livestock (doesn't include frags, those have a tankId now)
-------------------------------------------------------------------------------

CREATE TABLE livestock (
    livestockId             INTEGER PRIMARY KEY,
    tankId                  INTEGER NOT NULL,
    name                    TEXT NOT NULL,
    scientificName          TEXT,
    source                  TEXT,
    dateAcquired            TEXT NOT NULL,
    picture                 TEXT,
    description             TEXT,

    FOREIGN KEY (tankId) REFERENCES tanks (tankId)
);

-------------------------------------------------------------------------------
-- Journal entries, including parameters
-------------------------------------------------------------------------------

CREATE TABLE journals (
    tankId                  INTEGER NOT NULL,
    timestamp               TEXT NOT NULL,
    type                    TEXT NOT NULL,
    subType                 TEXT,
    value                   REAL,
    picture                 TEXT,
    note                    TEXT,
    isPrivate               INTEGER,

    FOREIGN KEY (tankId) REFERENCES tanks (tankId)
);

-------------------------------------------------------------------------------

COMMIT;
