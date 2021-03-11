BEGIN;

PRAGMA user_version = 2;

-------------------------------------------------------------------------------
-- Starting over
-------------------------------------------------------------------------------

DROP TABLE pictures;
DROP TABLE pictureSets;
DROP TABLE sellers;
DROP TABLE fragListings;
DROP TABLE deliveryMethods;

-------------------------------------------------------------------------------
-- Types table
-------------------------------------------------------------------------------

CREATE TABLE types (
    type            TEXT PRIMARY KEY,
    idx             INTEGER NOT NULL,
    name            TEXT NOT NULL
);

INSERT OR IGNORE INTO types VALUES ('sps',      1, 'SPS');
INSERT OR IGNORE INTO types VALUES ('lps',      2, 'LPS');
INSERT OR IGNORE INTO types VALUES ('zoa',      3, 'Zoa');
INSERT OR IGNORE INTO types VALUES ('softie',   4, 'Softie');
INSERT OR IGNORE INTO types VALUES ('other',    5, 'Other');

-------------------------------------------------------------------------------

CREATE TABLE users (
    -- The user ID we get from passport - only for internal use
    muid                TEXT PRIMARY KEY,
    -- The authentication source, like xenforo, facebook, etc
    source              TEXT NOT NULL,
    -- Name
    name                TEXT NOT NULL,
    -- The e-mail address
    email               TEXT NOT NULL
);

-------------------------------------------------------------------------------

CREATE TABLE sellers (
    -- ID of the seller - a random string
    msid                TEXT PRIMARY KEY,
    -- The associated market user ID, which is an internal ID
    muid                TEXT NOT NULL,
    -- The name of the seller in the market
    name                TEXT NOT NULL,
    -- The seller's location
    location            TEXT NOT NULL,
    -- The seller's logo (an upload)
    logo                TEXT,
    -- The seller's rating - 0 to 5
    -- ((Overall Rating * Total Rating) + new Rating) / (Total Rating + 1)
    rating              REAL NOT NULL DEFAULT 0,
    -- How many times the seller has been rated
    ratingCount         INTEGER NOT NULL DEFAULT 0,
    -- When we allow sellers to customize their "store"
    theme               TEXT,

    FOREIGN KEY (muid) REFERENCES users (muid)
);

-------------------------------------------------------------------------------

CREATE TABLE deliveryMethods (
    deliveryMethodId    TEXT PRIMARY KEY,
    description         TEXT
);

INSERT INTO deliveryMethods VALUES ('lp', 'Local pickup');

-------------------------------------------------------------------------------

CREATE TABLE pictureSets (
    pictureSetId        INTEGER PRIMARY KEY,
    -- When it was created, so we can prune old ones
    timestamp           TEXT NOT NULL,
    -- The seller it belongs to
    msid                TEXT NOT NULL,
    -- The maximum number of pictures allowed
    maximum             INTEGER NOT NULL,

    FOREIGN KEY (msid) REFERENCES sellers (msid)
);

CREATE TABLE pictures (
    pictureSetId        INTEGER NOT NULL,
    -- To order them
    idx                 INTEGER NOT NULL,
    -- The upload file name
    picture             TEXT NOT NULL,

    PRIMARY KEY (pictureSetId, idx),
    FOREIGN KEY (pictureSetId) REFERENCES pictureSets (pictureSetId)
);

-------------------------------------------------------------------------------

CREATE TABLE livestock (
    -- A random string
    lsid                TEXT PRIMARY KEY,
    -- The seller
    msid                TEXT NOT NULL,
    -- The timestamp when it was created
    createdTimestamp    TEXT NOT NULL,
    -- The timestamp of the last status change
    -- Initially, the same as the createdTimestamp
    statusTimestamp     TEXT NOT NULL,
    -- The fragId of the mother frag in the DBTC database, if any
    fragOf              INTEGER,
    -- Title
    title               TEXT NOT NULL,
    -- Description (could be markdown?)
    descritpion         TEXT NOT NULL,
    -- Type (SPS, etc)
    type                TEXT NOT NULL,
    -- Scientific name
    scientificName      TEXT,
    -- Source (could be a location, like 'Indo' or an LFS)
    source              TEXT,
    -- The date the colony was acquired
    dateAcquired        TEXT NOT NULL,
    -- The date the frag was cut or split, NULL
    -- if it is not a frag
    dateFragged         TEXT,
    -- Price, no decimals
    price               INTEGER NOT NULL,
    -- Currency
    currency            TEXT NOT NULL DEFAULT 'USD',
    -- How the item can be delivered - TBD
    deliveryMethodId    TEXT NOT NULL DEFAULT 'LP',
    -- References a picture set
    pictureSetId        INTEGER NOT NULL,
    -- The status of the listing.
    -- draft - means that it is not live in the market
    -- live - it's visible in the market
    -- pending - the sale is being arranged
    -- sold - it is sold and no longer editable
    --
    -- it can go from draft to live and back many times
    -- it can go from live to pending and back many times
    -- it can go from draft, live or pending to sold only once
    status              TEXT NOT NULL DEFAULT 'draft',

    FOREIGN KEY (msid)              REFERENCES sellers (msid),
    FOREIGN KEY (pictureSetId)      REFERENCES pictureSets (pictureSetId),
    FOREIGN KEY (deliveryMethodId)  REFERENCES deliveryMethods (deliveryMethodId),
    FOREIGN KEY (type)              REFERENCES types (type),

    CHECK (status IN ('draft', 'live', 'pending', 'sold'))
);

-------------------------------------------------------------------------------

COMMIT;
