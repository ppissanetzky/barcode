BEGIN;

PRAGMA user_version = 7;

-------------------------------------------------------------------------------

CREATE VIEW liveFrags (
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
        frags.isAlive = 1 AND
        frags.status IS NULL;

-------------------------------------------------------------------------------

CREATE VIEW motherOwners (
    motherId,
    ownerId
)
AS
    SELECT DISTINCT
        motherId, ownerId
    FROM
        liveFrags;

COMMIT;
