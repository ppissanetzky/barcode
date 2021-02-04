BEGIN;

PRAGMA user_version = 4;

-- Add the threadUrl to the mothers table

ALTER TABLE mothers ADD COLUMN threadUrl TEXT;

-- Add the status to the frags table

ALTER TABLE frags ADD COLUMN status TEXT;

-- Now, drop and recreate the motherFrags view to add timestamp and
-- the two new columns

DROP VIEW motherFrags;

CREATE VIEW motherFrags (
    motherId,
    timestamp,
    name, type, scientificName, flow, light, hardiness, growthRate,
    sourceType, source, cost, size, rules, threadId, threadUrl,
    fragId, ownerId, dateAcquired, picture, notes, fragOf, fragsAvailable, isAlive,
    status
)
AS
    SELECT
        mothers.motherId AS motherId,
        mothers.timestamp AS timestamp,
        name, type, scientificName, flow, light, hardiness, growthRate,
        sourceType, source, cost, size, rules, threadId, threadUrl,
        fragId, ownerId, dateAcquired, picture, notes, fragOf, fragsAvailable, isAlive,
        status
    FROM
        mothers,
        frags
    WHERE
        mothers.motherId = frags.motherId AND
        frags.fragOf IS NULL;

COMMIT;