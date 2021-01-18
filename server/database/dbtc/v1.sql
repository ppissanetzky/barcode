-------------------------------------------------------------------------------

PRAGMA user_version = 1;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Types table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS types (
    type            TEXT PRIMARY KEY NOT NULL,
    forumId         INTEGER NOT NULL
);

INSERT OR IGNORE INTO types (type, forumId) VALUES ('SPS',      31);
INSERT OR IGNORE INTO types (type, forumId) VALUES ('Zoa',      32);
INSERT OR IGNORE INTO types (type, forumId) VALUES ('Softie',   34);
INSERT OR IGNORE INTO types (type, forumId) VALUES ('Other',    35);
INSERT OR IGNORE INTO types (type, forumId) VALUES ('LPS',      36);

-------------------------------------------------------------------------------
-- Rules table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rules (
    rule            TEXT PRIMARY KEY NOT NULL,
    description     TEXT NOT NULL,
    url             TEXT
);

INSERT OR IGNORE INTO rules (rule, description, url)
VALUES (
    'DBTC',
    'Don''t break the chain',
    'https://www.bareefers.org/forum/threads/dbtc-info-rules.23030/'
);

INSERT OR IGNORE INTO rules (rule, description, url)
VALUES (
    'PIF',
    'Pay it forward (free stuff)',
    NULL
);

INSERT OR IGNORE INTO rules (rule, description, url)
VALUES (
    'Private',
    'Only visibile to you',
    NULL
);

-------------------------------------------------------------------------------
-- Mothers table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mothers (
    motherId        INTEGER PRIMARY KEY,
    timestamp       TEXT NOT NULL,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    scientificName  TEXT,
    flow            TEXT CHECK (flow IN('Low', 'Medium', 'High')) NOT NULL DEFAULT 'Medium',
    light           TEXT CHECK (light IN('Low', 'Medium', 'High')) NOT NULL DEFAULT 'Medium',
    hardiness       TEXT CHECK (hardiness IN('Sensitive', 'Normal', 'Hardy')) NOT NULL DEFAULT 'Normal',
    growthRate      TEXT CHECK (growthRate IN ('Slow', 'Normal', 'Fast')) NOT NULL DEFAULT 'Normal',
    sourceType      TEXT CHECK (sourceType IN ('Member', 'LFS', 'Online', 'Other')),
    source          TEXT,
    cost            REAL NOT NULL DEFAULT 0,
    size            TEXT,
    rules           TEXT NOT NULL,
    threadId        INTEGER,

    FOREIGN KEY (type) REFERENCES types (type),
    FOREIGN KEY (rules) REFERENCES rules (rule)
);

-------------------------------------------------------------------------------
-- Frags table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS frags (
    fragId          INTEGER PRIMARY KEY,
    timestamp       TEXT NOT NULL,
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
    journalId       INTEGER PRIMARY KEY,
    fragId          INTEGER NOT NULL,
    timestamp       TEXT NOT NULL,
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
    timestamp       TEXT NOT NULL,

    PRIMARY KEY (motherId, userId),
    FOREIGN KEY (motherId) REFERENCES mothers (motherId)
);

