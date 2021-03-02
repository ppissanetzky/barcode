BEGIN;

PRAGMA user_version = 5;

CREATE VIEW motherFans (
    motherId,
    fanCount
)
AS
    SELECT
        motherId,
        COUNT(userId)
    FROM
        fans
    GROUP BY
        motherId;

COMMIT;
