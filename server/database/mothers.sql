SELECT
    mothers.*,
    count(ownerId) AS ownerCount,
    json_group_array(
        json_object(
            'ownerId', ownerId,
            'fragId', fragId,
            'fragsAvailable', fragsAvailable
        )
    ) AS owners,
    json_group_array(picture) AS pictures
FROM
    mothers,
    frags
WHERE
    mothers.motherId = frags.motherId AND
    frags.isAlive = 1
GROUP BY
    1
ORDER BY
    mothers.name
