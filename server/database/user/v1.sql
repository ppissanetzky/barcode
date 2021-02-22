BEGIN;
-------------------------------------------------------------------------------

PRAGMA user_version = 1;

-------------------------------------------------------------------------------
-- Enable foreign keys enforcement
-------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-------------------------------------------------------------------------------
-- Items table
-------------------------------------------------------------------------------

CREATE TABLE settings (
    userId                  INTEGER NOT NULL,
    key                     TEXT NOT NULL,
    value                   TEXT,

    PRIMARY KEY (userId, key)
);

-------------------------------------------------------------------------------

COMMIT;