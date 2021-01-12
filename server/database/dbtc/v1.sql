-------------------------------------------------------------------------------

PRAGMA user_version = 1;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Mothers table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mothers (
    motherId        INTEGER PRIMARY KEY,
    timestamp       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name            TEXT NOT NULL,
    type            TEXT CHECK (type IN('LPS', 'SPS', 'Softie', 'Other')) NOT NULL,
    scientificName  TEXT,
    flow            TEXT CHECK (flow IN('Low', 'Medium', 'High')) NOT NULL DEFAULT 'Medium',
    light           TEXT CHECK (light IN('Low', 'Medium', 'High')) NOT NULL DEFAULT 'Medium',
    hardiness       TEXT CHECK (hardiness IN('Sensitive', 'Normal', 'Hardy')) NOT NULL DEFAULT 'Normal',
    growthRate      TEXT CHECK (growthRate IN ('Slow', 'Normal', 'Fast')) NOT NULL DEFAULT 'Normal',
    sourceType      TEXT CHECK (sourceType IN ('Member', 'LFS', 'Online', 'Other')),
    source          TEXT,
    cost            REAL NOT NULL DEFAULT 0,
    size            TEXT
);

-------------------------------------------------------------------------------
-- Frags table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS frags (
    fragId          INTEGER PRIMARY KEY,
    timestamp       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motherId        INTEGER NOT NULL,
    ownerId         INTEGER NOT NULL,
    dateAcquired    TEXT NOT NULL,
    picture         TEXT,
    notes           TEXT,
    fragOf          INTEGER NULL REFERENCES frags (fragId),
    fragsAvailable  INTEGER NULL DEFAULT 0,
    isAlive         INTEGER NULL DEFAULT 1,

    FOREIGN KEY (motherId) REFERENCES mothers (motherId)
);

-------------------------------------------------------------------------------
-- Journals table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS journals (
    fragId          INTEGER NOT NULL,
    timestamp       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    entryType       TEXT NOT NULL,
    picture         TEXT NULL,
    notes           TEXT NULL,

    FOREIGN KEY (fragId) REFERENCES frags (fragId)
);

-------------------------------------------------------------------------------
-- Fans table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fans (
    motherId        INTEGER NOT NULL,
    userId          INTEGER NOT NULL,
    timestamp       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (motherId, userId),
    FOREIGN KEY (motherId) REFERENCES mothers (motherId)
);

