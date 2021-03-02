BEGIN;

PRAGMA user_version = 6;

-------------------------------------------------------------------------------

CREATE TABLE fragsForSale (
    ffsId           INTEGER PRIMARY KEY,
    timestamp       TEXT NOT NULL,
    fragOf          INTEGER NOT NULL,
    title           TEXT NOT NULL,
    descritpion     TEXT NOT NULL,
    price           INTEGER NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'USD',
    status          TEXT NOT NULL DEFAULT 'unpublished',
    dateCut         TEXT NOT NULL,
    deliveryMethod  TEXT NOT NULL DEFAULT 'Local pickup',
    location        TEXT NOT NULL,
    -- Comma separated list of uploads
    pictures        TEXT NOT NULL,

    FOREIGN KEY (fragOf) REFERENCES frags (fragId),
    CHECK (status IN ('unpublished', 'published', 'sold'))
);

-------------------------------------------------------------------------------

COMMIT;
