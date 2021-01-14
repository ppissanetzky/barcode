-------------------------------------------------------------------------------

PRAGMA user_version = 1;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Users table
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id                  INTEGER PRIMARY KEY NOT NULL,
    name                TEXT NOT NULL,
    title               TEXT,
    location            TEXT,
    age                 INTEGER,
    isStaff             INTEGER,
    registerDate        INTEGER,
    viewUrl             TEXT,
    avatarUrl           TEXT
);

