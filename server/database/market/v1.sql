BEGIN;

PRAGMA user_version = 1;

-------------------------------------------------------------------------------

CREATE TABLE sellers (
    -- Internal ID
    sellerId            INTEGER PRIMARY KEY,
    -- External user ID of the form <source>:<id>
    -- For forum users it will be something like 'forum:15211'
    externalUserId      TEXT NOT NULL,
    -- A random, unique code that can be used in perma-links
    -- to the seller's items
    linkCode            TEXT NOT NULL,
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

    UNIQUE (externalUserId),
    UNIQUE (linkCode)
);

-------------------------------------------------------------------------------

CREATE TABLE deliveryMethods (
    deliveryMethodId    TEXT PRIMARY KEY,
    description         TEXT
);

INSERT INTO deliveryMethods VALUES ('LP', 'Local pickup');

-------------------------------------------------------------------------------

CREATE TABLE pictureSets (
    pictureSetId        INTEGER PRIMARY KEY,
    sellerId            INTEGER NOT NULL,
    maximum             INTEGER NOT NULL,

    FOREIGN KEY (sellerId) REFERENCES sellers (sellerId)
);

CREATE TABLE pictures (
    pictureSetId        INTEGER NOT NULL,
    idx                 INTEGER NOT NULL,
    picture             TEXT NOT NULL,

    PRIMARY KEY (pictureSetId, idx),
    FOREIGN KEY (pictureSetId) REFERENCES pictureSets (pictureSetId)
);

-------------------------------------------------------------------------------

CREATE TABLE fragListings (
    -- Internal ID
    listingId           INTEGER PRIMARY KEY,
    -- The seller
    sellerId            INTEGER NOT NULL,
    -- The timestamp when it was created
    createdTimestamp    TEXT NOT NULL,
    -- The timestamp of the last status change
    -- Initially, the same as the createdTimestamp
    statusTimestamp     TEXT NOT NULL,
    -- The fragId of the mother frag in the DBTC database
    fragOf              INTEGER NOT NULL,
    -- Title
    title               TEXT NOT NULL,
    -- Description (could be markdown?)
    descritpion         TEXT NOT NULL,
    -- The date the frag was cut or split
    cutTimestamp        TEXT NOT NULL,
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

    FOREIGN KEY (sellerId)          REFERENCES sellers (sellerId),
    FOREIGN KEY (pictureSetId)      REFERENCES pictureSets (pictureSetId),
    FOREIGN KEY (deliveryMethodId)  REFERENCES deliveryMethods (deliveryMethodId),

    CHECK (status IN ('draft', 'live', 'pending', 'sold'))
);

-------------------------------------------------------------------------------

COMMIT;
