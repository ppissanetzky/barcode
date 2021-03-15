BEGIN;

PRAGMA user_version = 6;

-------------------------------------------------------------------------------

CREATE VIEW children (
    motherId,
    fragsAvailable,
    childCount
)
AS
    SELECT
        mf.motherId AS motherId,
        SUM(IFNULL(frags.fragsAvailable, 0)) AS fragsAvailable,
        COUNT(DISTINCT frags.fragId) AS childCount
    FROM
        motherFrags AS mf
    LEFT OUTER JOIN
        frags
    ON
        frags.motherId = mf.motherId
        AND frags.fragOf IS NOT NULL
        AND frags.isAlive = 1
    GROUP BY
        mf.motherId;

-------------------------------------------------------------------------------

COMMIT;
