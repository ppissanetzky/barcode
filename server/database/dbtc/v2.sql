BEGIN;

PRAGMA user_version = 2;

-- A single view that shows the mother frags

CREATE VIEW IF NOT EXISTS motherFrags (
    motherId,
    name, type, scientificName, flow, light, hardiness, growthRate,
    sourceType, source, cost, size, rules, threadId,
    fragId, ownerId, dateAcquired, picture, notes, fragOf, fragsAvailable, isAlive
)
AS
    SELECT
        mothers.motherId AS motherId,
        name, type, scientificName, flow, light, hardiness, growthRate,
        sourceType, source, cost, size, rules, threadId,
        fragId, ownerId, dateAcquired, picture, notes, fragOf, fragsAvailable, isAlive
    FROM
        mothers,
        frags
    WHERE
        mothers.motherId = frags.motherId AND
        frags.fragOf IS NULL;

-- Indexes

CREATE INDEX IF NOT EXISTS motherRules ON mothers(rules);
CREATE INDEX IF NOT EXISTS fragOwners ON frags(ownerId);
CREATE INDEX IF NOT EXISTS fragFragOf ON frags(fragOf);

COMMIT;