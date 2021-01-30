BEGIN;

PRAGMA user_version = 3;

CREATE TABLE IF NOT EXISTS shares (
    shareId     TEXT PRIMARY KEY NOT NULL,
    hash        TEXT NOT NULL,
    timestamp   TEXT NOT NULL,
    shareType   TEXT NOT NULL,
    json        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sharesHash on shares(hash);

COMMIT;