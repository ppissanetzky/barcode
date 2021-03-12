const crypto = require('crypto');
const assert = require('assert');

const _ = require('lodash');

const {Database} = require('./db');

const {nowAsIsoString, utcIsoStringFromString} = require('./dates');

const {BC_MARKET_ENABLED} = require('./barcode.config');

//-----------------------------------------------------------------------------

const DBTC_DB_VERSION = 5;

const db = new Database('dbtc', DBTC_DB_VERSION);

//-----------------------------------------------------------------------------
// Add 'timestamp' and normalize it as well as 'dateAcquired' to an ISO UTC
// string
//-----------------------------------------------------------------------------

function fixDates(values) {
    const {timestamp, dateAcquired} = values;
    values.timestamp = timestamp ? utcIsoStringFromString(timestamp) : nowAsIsoString();
    if (dateAcquired) {
        values.dateAcquired = utcIsoStringFromString(dateAcquired);
    }
    return values;
}

//-----------------------------------------------------------------------------

const SELECT_TYPES = 'SELECT * FROM types ORDER BY type';

function getTypes() {
    return db.all(SELECT_TYPES, {});
}

const SELECT_TYPE = 'SELECT * FROM types WHERE type = $type';

function getType(type) {
    const [row] = db.all(SELECT_TYPE, {type});
    return row;
}

const SELECT_RULES = 'SELECT * FROM rules ORDER BY rule';

function getEnums() {
    const types = db.all(SELECT_TYPES, {});
    const rules = db.all(SELECT_RULES, {});
    const market = BC_MARKET_ENABLED ? true : undefined;
    return {types, rules, market};
}

const VALIDATE_RULES = 'SELECT rule FROM rules WHERE rule = $rules';

function validateRules(rules) {
    const [found] = db.all(VALIDATE_RULES, {rules});
    return Boolean(found);
}

//-----------------------------------------------------------------------------
// All frags for a given user
//-----------------------------------------------------------------------------

const SELECT_FRAGS_FOR_USER = `
    SELECT
        mothers.*,
        frags.*,
        motherFans.fanCount
    FROM
        mothers,
        frags
    LEFT OUTER JOIN
        motherFans
    ON
        mothers.motherId = motherFans.motherId
    WHERE
        frags.motherId = mothers.motherId AND
        frags.ownerId = $userId
    ORDER BY
        frags.dateAcquired DESC,
        mothers.name ASC
`;

function selectAllFragsForUser(user) {
    return db.all(SELECT_FRAGS_FOR_USER, {userId: user.id});
}

function getAllDBTCFragsForUser(userId) {
    return db.all(
        `
        SELECT
            mothers.*,
            frags.*,
            motherFans.fanCount
        FROM
            mothers,
            frags
        LEFT OUTER JOIN
            motherFans
        ON
            mothers.motherId = motherFans.motherId
        WHERE
            mothers.rules = 'dbtc' AND
            frags.motherId = mothers.motherId AND
            frags.ownerId = $userId AND
            frags.isAlive = 1 AND
            frags.status IS NULL
        ORDER BY
            mothers.name ASC
        `,
        {userId}
    );
}

//-----------------------------------------------------------------------------

const SELECT_A_FRAG = `
    SELECT
        mothers.*,
        frags.*,
        motherFans.fanCount
    FROM
        mothers,
        frags
    LEFT OUTER JOIN
        motherFans
    ON
        mothers.motherId = motherFans.motherId
    WHERE
        frags.motherId = mothers.motherId AND
        frags.fragId = $fragId
`;

const SELECT_FRAG_JOURNALS = `
    SELECT
        *
    FROM
        journals
    WHERE
        journals.fragId = $fragId
    ORDER BY
        timestamp DESC
`;

function selectFrag(fragId) {
    const bindings = {
        fragId
    };
    const [frag] = db.all(SELECT_A_FRAG, bindings);
    const journals = db.all(SELECT_FRAG_JOURNALS, bindings);
    return [frag, journals];
}

function getFragJournals(fragId) {
    return db.all(SELECT_FRAG_JOURNALS, {fragId});
}

//-----------------------------------------------------------------------------
// Reverse chronological journal entries for a given mother
//-----------------------------------------------------------------------------

const SELECT_MOTHER_JOURNALS = `
    SELECT
        frags.ownerId AS ownerId,
        frags.dateAcquired AS dateAcquired,
        journals.timestamp AS timestamp,
        journals.entryType AS entryType,
        journals.picture AS picture,
        journals.notes AS notes
    FROM
        frags,
        journals
    WHERE
        frags.motherId = $motherId AND
        journals.fragId = frags.fragId AND
        -- This removed the acquired entries that are not from the
        -- owner, otherwise, every time someone gives a frag, we would
        -- get two journal entries
        NOT (journals.entryType = 'acquired' AND frags.ownerId != $ownerId)
    ORDER BY
        timestamp DESC
`;

//-----------------------------------------------------------------------------

const SELECT_MOTHER = `SELECT * FROM motherFrags WHERE motherId = $motherId`;

function getMotherFrag(motherId) {
    const [frag] = db.all(SELECT_MOTHER, {motherId});
    // Could be undefined
    return frag;
}

//-----------------------------------------------------------------------------
// Just the frag part, since we will load the mother separately. Exclude
// any that have been transferred but include dead ones.
//-----------------------------------------------------------------------------

const SELECT_JUST_FRAGS_FOR_MOTHER = `
    SELECT
        *
    FROM
        frags
    WHERE
        motherId = $motherId AND
        (status IS NULL OR status != 'transferred')
`;

//-----------------------------------------------------------------------------

function getJournalsForMother(motherId) {
    const [frag] = db.all(SELECT_MOTHER, {motherId});
    if (!frag) {
        return {};
    }
    const journals = db.all(SELECT_MOTHER_JOURNALS, {
        motherId,
        ownerId: frag.ownerId
    });
    const frags = db.all(SELECT_JUST_FRAGS_FOR_MOTHER, {motherId});
    return {frag, journals, frags};
}

//-----------------------------------------------------------------------------

const INSERT_MOTHER = `
    INSERT INTO mothers
        (
            timestamp,
            name,
            type,
            scientificName,
            flow,
            light,
            hardiness,
            growthRate,
            sourceType,
            source,
            cost,
            size,
            rules,
            threadId,
            threadUrl
        )
    VALUES
        (
            $timestamp,
            $name,
            $type,
            $scientificName,
            $flow,
            $light,
            $hardiness,
            $growthRate,
            $sourceType,
            $source,
            $cost,
            $size,
            $rules,
            $threadId,
            $threadUrl
        )
`;

const INSERT_FRAG = `
    INSERT INTO frags
        (
            timestamp,
            motherId,
            ownerId,
            dateAcquired,
            picture,
            notes,
            fragOf,
            fragsAvailable,
            isAlive
        )
    VALUES
        (
            $timestamp,
            $motherId,
            $ownerId,
            $dateAcquired,
            $picture,
            $notes,
            $fragOf,
            $fragsAvailable,
            1
        )
`;

const INSERT_ITEM_NULLABLE_VALUES = {
    scientificName: null,
    sourceType: null,
    source: null,
    size: null,
    cost: 0,
    picture: null,
    notes: null,
    threadId: null,
    threadUrl: null
};

function insertItem(values) {
    return db.transaction(({run}) => {
        const bindings = fixDates({
            ...INSERT_ITEM_NULLABLE_VALUES,
            ...values
        });
        const motherId = run(INSERT_MOTHER, bindings);
        const fragBindings = {
            ...bindings,
            motherId,
            fragOf: null
        };
        const fragId = run(INSERT_FRAG, fragBindings);
        return [motherId, fragId];
    });
}

const DECREMENT_FRAGS_AVAILABLE = `
    UPDATE
        frags
    SET
        fragsAvailable = MAX(fragsAvailable - 1, 0)
    WHERE
        fragId = $fragId AND
        ownerId = $ownerId
`;

const SELECT_FRAGS_AVAILABLE = `
    SELECT
        fragsAvailable
    FROM
        frags
    WHERE
        fragId = $fragId AND
        ownerId = $ownerId
`;

// give a frag to someone else. userId is the one that is
// giving the frag
//
// values.ownerId is the recipient
// values.fragOf is the ID of the source frag

const INSERT_FRAG_NULLABLE_VALUES = {
    picture: null,
    notes: null
};

function giveAFrag(userId, values) {
    return db.transaction(({run, all}) => {
        // Insert into the frags table
        const fragBindings = {
            ...INSERT_FRAG_NULLABLE_VALUES,
            ...values,
            fragsAvailable: 0
        };
        const fragId = run(INSERT_FRAG, fixDates(fragBindings));

        // If it is a transfer, mark the source frag as dead
        // with a 'transferred' status. Return with zero frags
        // available
        if (values.transfer) {
            run(UPDATE_ALIVE, {
                fragId: values.fragOf,
                ownerId: userId,
                status: 'transferred'
            });
            return [0, fragId];
        }

        // Otherwise, decrement available frags on the source frag
        run(DECREMENT_FRAGS_AVAILABLE, {
            ownerId: userId,
            fragId: values.fragOf
        });

        // Now get the current number of frags available
        const [{fragsAvailable}] = all(SELECT_FRAGS_AVAILABLE, {
            ownerId: userId,
            fragId: values.fragOf
        });
        return [fragsAvailable, fragId];
    });
}

//-----------------------------------------------------------------------------
// Select everything about a frag given parameters - to validate the frag
//-----------------------------------------------------------------------------

const SELECT_VALID_FRAG = `
    SELECT
        *
    FROM
        mothers,
        frags
    WHERE
        frags.fragId            = $fragId AND
        frags.motherId          = mothers.motherId AND
        frags.isAlive           = $isAlive AND
        frags.fragsAvailable    > $fragsAvailable AND
        frags.ownerId           = $ownerId
`;

// Returns undefined if the frag is not valid. Otherwise, returns
// the one and only row

function validateFrag(ownerId, fragId, isAlive, fragsAvailable) {
    const [frag] = db.all(SELECT_VALID_FRAG, {
        fragId,
        isAlive: isAlive ? 1 : 0,
        fragsAvailable,
        ownerId
    });
    return frag;
}

//-----------------------------------------------------------------------------
// Given an owner, frag ID and a new number for fragsAvailable
//-----------------------------------------------------------------------------

const UPDATE_FRAGS_AVAILABLE = `
    UPDATE
        frags
    SET
        fragsAvailable = MAX($fragsAvailable, 0)
    WHERE
        fragId = $fragId AND
        ownerId = $ownerId
`;

function updateFragsAvailable(ownerId, fragId, fragsAvailable) {
    return db.transaction(({run, all}) => {
        run(UPDATE_FRAGS_AVAILABLE, {
            fragId,
            ownerId,
            fragsAvailable
        });
        const [{fragsAvailable: result}] = all(SELECT_FRAGS_AVAILABLE, {
            fragId,
            ownerId
        });
        return result;
    });
}

//-----------------------------------------------------------------------------

const INSERT_JOURNAL = `
    INSERT INTO journals (
        fragId,
        timestamp,
        entryType,
        picture,
        notes
    )
    VALUES (
        $fragId,
        $timestamp,
        $entryType,
        $picture,
        $notes
    )
`;

const SELECT_JOURNAL = `SELECT * FROM journals WHERE journalId = $journalId`;

const JOURNAL_NULLABLE_VALUES = {
    picture: null,
    notes: null
};

function addJournal(values) {
    return db.transaction(({run, all}) => {
        const journalId = run(INSERT_JOURNAL, fixDates({
            ...JOURNAL_NULLABLE_VALUES,
            ...values
        }));
        const [journal] = all(SELECT_JOURNAL, {journalId});
        return journal;
    });
}

//-----------------------------------------------------------------------------
// Also used for give a frag when it is a transfer

const UPDATE_ALIVE = `
    UPDATE
        frags
    SET
        isAlive = 0,
        fragsAvailable = 0,
        status = $status
    WHERE
        fragId = $fragId AND
        ownerId = $ownerId
`;

function markAsDead(ownerId, fragId, status) {
    db.run(UPDATE_ALIVE, {fragId, ownerId, status: status || null});
}

//-----------------------------------------------------------------------------

const UPDATE_PICTURE = `
    UPDATE
        frags
    SET
        picture = $picture
    WHERE
        fragId = $fragId AND
        ownerId = $ownerId
`;

function updateFragPicture(ownerId, fragId, picture) {
    db.run(UPDATE_PICTURE, {ownerId, fragId, picture})
}

const CLEAR_PICTURE = `
    UPDATE
        frags
    SET
        picture = NULL
    WHERE
        picture = $picture
`;

function clearFragPicture(picture) {
    db.run(CLEAR_PICTURE, {picture});
}

//-----------------------------------------------------------------------------

const SELECT_COLLECTION_PAGED = `
    SELECT
        mf.*,
        -- 1 if this user owns the mother frag
        CASE WHEN mf.ownerId = $userId THEN 1 ELSE 0 END as ownsIt,
        -- Adds up all the available children frags
        SUM(IFNULL(frags.fragsAvailable, 0)) AS otherFragsAvailable,
        -- Ends up being 1 if the user owns one of the children frags
        MAX(CASE WHEN frags.ownerId = $userId THEN 1 ELSE 0 END) AS hasOne,
        -- Counts the number of children frags
        COUNT(DISTINCT frags.fragId) AS childCount,
        -- Ends up being 1 if the user is a fan
        MAX(CASE WHEN fans.userId = $userId THEN 1 ELSE 0 END) AS isFan,
        -- Counts the number of fans
        COUNT(DISTINCT fans.userId) as fanCount
    FROM
        motherFrags AS mf
    LEFT OUTER JOIN
        frags
    ON
        -- Skip the mother frag in the children
        frags.fragOf IS NOT NULL
        -- The child has to be alive
        AND frags.isAlive = 1
        -- And it has to have the same mother
        AND frags.motherId = mf.motherId
    LEFT OUTER JOIN
        fans
    ON
        fans.motherId = mf.motherId
    WHERE
        mf.rules = $rules
        -- The subquery skips ahead the given number of items
        -- This is called 'keyset pagination'
        -- It must have the same WHERE as above and the same
        -- ORDER BY as below
        AND ($type IS NULL OR mf.type = $type)
        AND ($ownerId IS NULL OR mf.ownerId = $ownerId)
        AND ($name IS NULL OR mf.name LIKE $name)
        AND mf.motherId NOT IN (
            SELECT
                mf.motherId
            FROM
                motherFrags AS mf
            WHERE
                mf.rules = $rules
                AND ($type IS NULL OR mf.type = $type)
                AND ($ownerId IS NULL OR mf.ownerId = $ownerId)
                AND ($name IS NULL OR mf.name LIKE $name)
            ORDER BY
                mf.timestamp DESC
            -- Skips previous pages - $page is 1 based
            LIMIT $itemsPerPage * ($page - 1)
        )
    GROUP BY
        1
    ORDER BY
        mf.timestamp DESC
    LIMIT
        $itemsPerPage
    `
const ITEMS_PER_PAGE = 12;

const NULL_FILTERS = {
    type: null,
    ownerId: null,
    name: null
};

function selectCollectionPaged(userId, rules, page, filters) {
    return db.all(SELECT_COLLECTION_PAGED, {
        userId,
        rules,
        page,
        itemsPerPage: ITEMS_PER_PAGE,
        ...NULL_FILTERS,
        ...filters
    });
}

//-----------------------------------------------------------------------------
// This is used when displaying all frags for a mother AND also to generate the
// lineage tree. If you change it, make sure both work correctly.
// It is also used by the DBTC nag job
//-----------------------------------------------------------------------------

const SELECT_FRAGS_FOR_MOTHER = `
    SELECT
        mothers.*,
        frags.*,
        motherFans.fanCount
    FROM
        mothers,
        frags
    LEFT OUTER JOIN
        motherFans
    ON
        mothers.motherId = motherFans.motherId
    WHERE
        mothers.motherId = $motherId AND
        frags.motherId = mothers.motherId
    ORDER BY
        fragOf,
        dateAcquired
`;

function selectFragsForMother(motherId) {
    return db.all(SELECT_FRAGS_FOR_MOTHER, {motherId});
}

//-----------------------------------------------------------------------------
// Top 10 lists
//-----------------------------------------------------------------------------

const TOP_10 = {

    contributors: `
        SELECT
            ownerId AS ownerId,
            COUNT(fragId) AS count
        FROM
            mothers,
            frags
        WHERE
            mothers.rules = 'dbtc' AND
            mothers.motherId = frags.motherId AND
            fragOf IS NULL
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10`,

    givers: `
        SELECT
            f2.ownerId AS ownerId,
            COUNT(f1.fragId) AS count
        FROM
            mothers,
            frags AS f1,
            frags AS f2
        WHERE
            mothers.rules = 'dbtc' AND
            f1.motherId = mothers.motherId AND
            f1.fragOf IS NOT NULL AND
            (f2.status IS NULL OR f2.status != 'transferred') AND
            f2.fragId = f1.fragOf
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10`,

    linkers: `
        SELECT
            f2.ownerId AS ownerId,
            COUNT(f1.fragId) AS count
        FROM
            mothers,
            frags AS f1,
            frags AS f2
        WHERE
            mothers.rules = 'dbtc' AND
            f1.motherId = mothers.motherId AND
            f1.fragOf IS NOT NULL AND
            (f2.status IS NULL OR f2.status != 'transferred') AND
            f2.fragOf IS NOT NULL AND
            f2.fragId = f1.fragOf
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10`,

    journalers: `
        SELECT
            ownerId AS ownerId,
            COUNT(journalId) AS count
        FROM
            mothers,
            frags,
            journals
        WHERE
            mothers.rules = 'dbtc' AND
            mothers.motherId = frags.motherId AND
            journals.fragId = frags.fragId AND
            journals.entryType IN ('good', 'bad', 'update')
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10`,

    collectors: `
        SELECT
            ownerId AS ownerId,
            COUNT(fragId) AS count
        FROM
            mothers,
            frags
        WHERE
            mothers.rules = 'dbtc' AND
            mothers.motherId = frags.motherId AND
            frags.isAlive = 1 AND
            frags.fragOf IS NOT NULL
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10`,

    likes: `
        SELECT
            mothers.name as ownerName,
            COUNT(userId) AS count
        FROM
            mothers,
            fans
        WHERE
            mothers.rules = 'dbtc' AND
            mothers.motherId = fans.motherId
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10`
}

function getDbtcTop10s() {
    return Object.keys(TOP_10).reduce((result, key) => {
        result[key] = db.all(TOP_10[key], {});
        return result;
    }, {});
}

//-----------------------------------------------------------------------------

const STATS_CONTRIBUTED_ITEM_COUNT = `
    SELECT
        mothers.type AS type,
        COUNT(DISTINCT ownerFrags.fragId) AS count,
        JSON_GROUP_ARRAY(ownerFrags.fragId) AS fragIds
    FROM
        mothers,
        frags as ownerFrags
    WHERE
        mothers.rules = $rules AND
        ownerFrags.motherId = mothers.motherId AND
        ownerFrags.fragOf IS NULL AND
        ownerFrags.ownerId = $userId
    GROUP BY 1
    ORDER BY 1
`;

const STATS_CONTRIBUTED_FRAG_COUNT = `
    SELECT
        mothers.type AS type,
        COUNT(DISTINCT recipientFrags.fragId) AS count,
        JSON_GROUP_ARRAY(recipientFrags.fragId) AS fragIds
    FROM
        mothers,
        frags as ownerFrags,
        frags as recipientFrags
    WHERE
        mothers.rules = $rules AND
        ownerFrags.motherId = mothers.motherId AND
        ownerFrags.fragOf IS NULL AND
        ownerFrags.ownerId = $userId AND
        recipientFrags.fragOf = ownerFrags.fragId
    GROUP BY 1
    ORDER BY 1
`;

const STATS_GIVE_BACK_FRAG_COUNT = `
    SELECT
        mothers.type AS type,
        COUNT(DISTINCT recipientFrags.fragId) AS count,
        JSON_GROUP_ARRAY(recipientFrags.fragId) AS fragIds
    FROM
        mothers,
        frags as ownerFrags,
        frags as recipientFrags
    WHERE
        mothers.rules = $rules AND
        ownerFrags.motherId = mothers.motherId AND
        ownerFrags.fragOf IS NOT NULL AND
        ownerFrags.ownerId = $userId AND
        recipientFrags.fragOf = ownerFrags.fragId
    GROUP BY 1
    ORDER BY 1
`;

const STATS_COMPLETED_LINKS = `
    SELECT
        type,
        SUM(CASE WHEN count >= 2 THEN 1 ELSE 0 END) AS count,
        JSON_GROUP_ARRAY(motherId) as motherIds
    FROM
        (
            SELECT
                mothers.type AS type,
                mothers.motherId AS motherId,
                COUNT(DISTINCT recipientFrags.fragId) AS count
            FROM
                mothers,
                frags as ownerFrags,
                frags as recipientFrags
            WHERE
                mothers.rules = $rules AND
                ownerFrags.motherId = mothers.motherId AND
                ownerFrags.fragOf IS NOT NULL AND
                ownerFrags.ownerId = $userId AND
                recipientFrags.fragOf = ownerFrags.fragId
            GROUP BY 1, 2
        )
    GROUP BY 1
    ORDER BY 1

`;

const STATS_RECEIVED_FRAG_COUNT = `
    SELECT
        mothers.type AS type,
        COUNT(DISTINCT recipientFrags.fragId) AS count,
        JSON_GROUP_ARRAY(recipientFrags.fragId) AS fragIds
    FROM
        mothers,
        frags as ownerFrags,
        frags as recipientFrags
    WHERE
        mothers.rules = $rules AND
        ownerFrags.motherId = mothers.motherId AND
        recipientFrags.ownerId = $userId AND
        recipientFrags.fragOf = ownerFrags.fragId
    GROUP BY 1
    ORDER BY 1
`;

const STATS_LIVE_FRAG_COUNT = `
    SELECT
        mothers.type AS type,
        COUNT(DISTINCT recipientFrags.fragId) AS count,
        JSON_GROUP_ARRAY(recipientFrags.fragId) AS fragIds
    FROM
        mothers,
        frags as ownerFrags,
        frags as recipientFrags
    WHERE
        mothers.rules = $rules AND
        ownerFrags.motherId = mothers.motherId AND
        recipientFrags.ownerId = $userId AND
        recipientFrags.fragOf = ownerFrags.fragId AND
        recipientFrags.isAlive = 1 AND
        (recipientFrags.status IS NULL OR recipientFrags.status != 'transferred')
    GROUP BY 1
    ORDER BY 1
`;

const STATS_DEAD_FRAG_COUNT = `
    SELECT
        mothers.type AS type,
        COUNT(DISTINCT recipientFrags.fragId) AS count,
        JSON_GROUP_ARRAY(recipientFrags.fragId) AS fragIds
    FROM
        mothers,
        frags as ownerFrags,
        frags as recipientFrags
    WHERE
        mothers.rules = $rules AND
        ownerFrags.motherId = mothers.motherId AND
        recipientFrags.ownerId = $userId AND
        recipientFrags.fragOf = ownerFrags.fragId AND
        (recipientFrags.isAlive = 0 OR recipientFrags.status = 'transferred')
    GROUP BY 1
    ORDER BY 1
`;

function getUserStats(userId) {
    return db.transaction(({all}) => {

        function data(query, params) {
            const result = all(query, params);
            for (const row of result) {
                if (row.fragIds) {
                    row.fragIds = JSON.parse(row.fragIds);
                }
            }
            return result;
        }

        const dbtcParams = {userId, rules: 'dbtc'};
        const pifParams = {userId, rules: 'pif'};
        const privateParams = {userId, rules: 'private'};
        const result = {
            dbtc: [
                {
                    title: 'Contributed items',
                    data: data(STATS_CONTRIBUTED_ITEM_COUNT, dbtcParams)
                },
                {
                    title: 'Contributed frags',
                    data: data(STATS_CONTRIBUTED_FRAG_COUNT, dbtcParams)
                },
                {
                    title: 'Frags put back',
                    data: data(STATS_GIVE_BACK_FRAG_COUNT, dbtcParams),
                },
                {
                    title: 'Completed links',
                    data: data(STATS_COMPLETED_LINKS, dbtcParams)
                        .filter(({count}) => count > 0),
                },
                {
                    title: 'Frags received',
                    data: data(STATS_RECEIVED_FRAG_COUNT, dbtcParams)
                },
                {
                    title: 'Received frags alive',
                    data: data(STATS_LIVE_FRAG_COUNT, dbtcParams)
                },
                {
                    title: 'Received frags that died or were transferred',
                    data: data(STATS_DEAD_FRAG_COUNT, dbtcParams)
                }
            ],
            pif: [
                {
                    title: 'Contributed items',
                    data: data(STATS_CONTRIBUTED_ITEM_COUNT, pifParams)
                },
                {
                    title: 'Contributed frags',
                    data: data(STATS_CONTRIBUTED_FRAG_COUNT, pifParams)
                },
                {
                    title: 'Frags put back',
                    data: data(STATS_GIVE_BACK_FRAG_COUNT, pifParams)
                },
                {
                    title: 'Frags received',
                    data: data(STATS_RECEIVED_FRAG_COUNT, pifParams)
                },
                {
                    title: 'Received frags alive',
                    data: data(STATS_LIVE_FRAG_COUNT, pifParams)
                },
                {
                    title: 'Received frags that died or were transferred',
                    data: data(STATS_DEAD_FRAG_COUNT, pifParams)
                }
            ],
            private: [
                {
                    title: 'Items',
                    data: data(STATS_CONTRIBUTED_ITEM_COUNT, privateParams)
                }
            ]
        };
        ['dbtc', 'pif', 'private'].forEach((section) => {
            result[section] = result[section].filter(({data}) => data.length);
        });
        return result;
    });
}

//-----------------------------------------------------------------------------

const UPDATE_MOTHER = `
    UPDATE
        mothers
    SET
        timestamp = $timestamp,
        name = $name,
        type = $type,
        scientificName = $scientificName,
        flow = $flow,
        light = $light,
        hardiness = $hardiness,
        growthRate = $growthRate,
        sourceType = $sourceType,
        source = $source,
        cost = $cost,
        size = $size,
        rules = $rules
    WHERE
        motherId = $motherId
`;

function updateMother(values) {
    db.run(UPDATE_MOTHER, fixDates({
        ...INSERT_ITEM_NULLABLE_VALUES,
        ...values
    }));
}

const UPDATE_FRAG = `
    UPDATE
        frags
    SET
        timestamp = $timestamp,
        dateAcquired = $dateAcquired,
        notes = $notes
    WHERE
        fragId = $fragId
`;

function updateFrag(values) {
    db.run(UPDATE_FRAG, fixDates({
        ...INSERT_ITEM_NULLABLE_VALUES,
        ...values
    }));
}

//-----------------------------------------------------------------------------

const UPDATE_THREAD_ID = `
    UPDATE mothers SET threadId = $threadId WHERE motherId = $motherId
`

function setMotherThreadId(motherId, threadId) {
    db.run(UPDATE_THREAD_ID, {motherId, threadId});
}

//-----------------------------------------------------------------------------

const ADD_FAN = `
    INSERT OR IGNORE INTO fans (motherId, userId, timestamp)
    VALUES ($motherId, $userId, $timestamp)
`;

function addFan(userId, motherId) {
    db.run(ADD_FAN, fixDates({userId, motherId}));
}

const DELETE_FAN = `
    DELETE FROM fans WHERE motherId = $motherId and userId = $userId
`;

function removeFan(userId, motherId) {
    db.run(DELETE_FAN, {userId, motherId});
}

const SELECT_FAN = `
    SELECT motherId FROM fans WHERE userId = $userId AND motherId = $motherId
`;

function isFan(userId, motherId) {
    const [row] = db.all(SELECT_FAN, {userId, motherId});
    return row ? true : false;
}

const SELECT_FANS = `
    SELECT userId, timestamp FROM fans WHERE motherId = $motherId ORDER BY timestamp
`;

function getFans(motherId) {
    return db.all(SELECT_FANS, {motherId});
}

const SELECT_LIKES = `
    SELECT
        userId
    FROM
        fans
    WHERE
        motherId = $motherId
    ORDER BY
        timestamp
`;

function getLikes(userId, motherId) {
    const users = db.all(SELECT_LIKES, {motherId}).map(({userId}) => userId);
    return ({
        isFan: users.some((id) => id === userId),
        likes: users.length,
        users
    });
}

//-----------------------------------------------------------------------------

const SELECT_RANDOM_STRING = `
    SELECT
        LOWER(HEX(RANDOMBLOB(16))) AS shareId
`;

const SELECT_SHARE_BY_HASH = `
    SELECT shareId FROM shares WHERE hash = $hash
`;

const INSERT_SHARE = `
    INSERT INTO shares (
        shareId,
        hash,
        timestamp,
        shareType,
        json
    )
    VALUES (
        $shareId,
        $hash,
        $timestamp,
        $shareType,
        $json
    )
`;

function shareFrag(frag, journals) {
    assert(frag, `Invalid frag`);
    const json = JSON.stringify({frag, journals});
    // Hash the actual JSON to see if it has already been shared
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    const [result] = db.all(SELECT_SHARE_BY_HASH, {hash});
    if (result && result.shareId) {
        return result.shareId;
    }
    const [{shareId}] = db.all(SELECT_RANDOM_STRING, {});
    db.run(INSERT_SHARE, fixDates({
        shareId,
        hash,
        shareType: 'frag',
        json
    }));
    return shareId;
}

const SELECT_SHARE = `
    SELECT shareType, json FROM shares WHERE shareId = $shareId
`;

function getShare(shareId) {
    const [row] = db.all(SELECT_SHARE, {shareId});
    // Can be null or undefined, rather than throwing an error
    return row;
}

//-----------------------------------------------------------------------------
// Just an array of user IDs for DBTC nagging purposes
//-----------------------------------------------------------------------------

const SELECT_UNIQUE_USERS = `SELECT DISTINCT ownerId FROM frags`;

function getUserIds() {
    return db.all(SELECT_UNIQUE_USERS, {}).map(({ownerId}) => ownerId);
}

//-----------------------------------------------------------------------------

const SELECT_DBTC_THREADS = `
    SELECT
        motherId,
        threadId
    FROM
        mothers
    WHERE
        rules = 'dbtc' AND
        threadId IS NOT NULL
`;

function getDbtcThreads() {
    return db.all(SELECT_DBTC_THREADS, {});
}

//-----------------------------------------------------------------------------
// Returns an array of all thread IDs the given user has imported
//-----------------------------------------------------------------------------

const SELECT_USER_THREADS = `
    SELECT
        threadId
    FROM
        motherFrags
    WHERE
        motherFrags.ownerId = $userId AND
        threadId IS NOT NULL AND
        threadId > 0
`;

function getUserThreadIds(userId) {
    return db.all(SELECT_USER_THREADS, {userId}).map(({threadId}) => threadId);
}

//-----------------------------------------------------------------------------

const SELECT_MOTHER_FOR_THREAD = `SELECT * FROM motherFrags WHERE threadId = $threadId`;

function getMotherForThread(threadId) {
    const [row] = db.all(SELECT_MOTHER_FOR_THREAD, {threadId});
    // Can be undefined
    return row;
}

//-----------------------------------------------------------------------------

module.exports = {
    db,
    selectAllFragsForUser,
    insertItem,
    selectFrag,
    getFragJournals,
    validateFrag,
    updateFragsAvailable,
    giveAFrag,
    addJournal,
    markAsDead,
    updateFragPicture,
    selectCollectionPaged,
    getTypes,
    getType,
    getEnums,
    selectFragsForMother,
    validateRules,
    getDbtcTop10s,
    updateMother,
    updateFrag,
    addFan,
    removeFan,
    isFan,
    setMotherThreadId,
    shareFrag,
    getShare,
    getUserIds,
    getFans,
    getLikes,
    getDbtcThreads,
    getUserThreadIds,
    clearFragPicture,
    getMotherForThread,
    getJournalsForMother,
    getUserStats,
    getMotherFrag,
    getAllDBTCFragsForUser
}
