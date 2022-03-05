BEGIN;
-------------------------------------------------------------------------------

PRAGMA user_version = 4;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Drop the old livestock table
-------------------------------------------------------------------------------

DROP TABLE livestock;

-------------------------------------------------------------------------------
-- Create the new one
-------------------------------------------------------------------------------

CREATE TABLE livestock (
    livestockId     INTEGER PRIMARY KEY,
    timestamp       INTEGER NOT NULL,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL, -- 'fish', 'invert'
    scientificName  TEXT,
    ownerId         INTEGER NOT NULL,
    dateAcquired    TEXT NOT NULL,
    source          TEXT,
    cost            REAL NOT NULL DEFAULT 0,
    size            TEXT,
    picture         TEXT,
    notes           TEXT,
    status          TEXT, -- 'dead'
    tankId          INTEGER,

    FOREIGN KEY (tankId) REFERENCES tanks (tankId)
);

CREATE INDEX livestockOwner ON livestock(ownerId);
CREATE INDEX livestockTank ON livestock(tankId);

-------------------------------------------------------------------------------
-- Livestock journals
-------------------------------------------------------------------------------

CREATE TABLE livestockJournals (
    journalId       INTEGER PRIMARY KEY,
    livestockId     INTEGER NOT NULL,
    timestamp       INTEGER NOT NULL,
    picture         TEXT,
    notes           TEXT,

    FOREIGN KEY (livestockId) REFERENCES livestock (livestockId)
);

CREATE INDEX livestockJournalsLivestockId ON livestockJournals(livestockId);

-------------------------------------------------------------------------------

COMMIT;
