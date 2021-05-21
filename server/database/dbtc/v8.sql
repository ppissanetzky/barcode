BEGIN;

PRAGMA user_version = 8;

-------------------------------------------------------------------------------

CREATE TABLE swaps (
    swapId          INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    date            TEXT NOT NULL,
    -- Free-form
    time            TEXT NOT NULL,
    address         TEXT NOT NULL,
    mapUrl          TEXT NOT NULL,
    threadId        TEXT NOT NULL,
    threadUrl       TEXT NOT NULL,
    -- Starts out as 1, then 0 when it is over
    isOpen          INTEGER NOT NULL
);

-------------------------------------------------------------------------------

CREATE TABLE swapFrags (
    swapFragId      INTEGER PRIMARY KEY,
    swapId          INTEGER NOT NULL,
    -- The ID of the frag it came from
    sourceFragId    INTEGER NOT NULL,
    -- Could be the original owner or someone that the original
    -- owner gave the frag to trade at the swap
    traderId        INTEGER NOT NULL,
    -- ultra/bonus/standard
    category        TEXT NOT NULL,
    -- The ID of the new frag that is created in the frags table
    -- when it is swapped. Starts out NULL
    resultingFragId INTEGER,

    FOREIGN KEY (swapId) REFERENCES swaps(swapId),
    FOREIGN KEY (sourceFragId) REFERENCES frags(fragId)
);

-------------------------------------------------------------------------------

COMMIT;
