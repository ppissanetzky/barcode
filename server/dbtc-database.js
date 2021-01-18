
const {Database} = require('./db');

const {nowAsIsoString, utcIsoStringFromString} = require('../dates');

//-----------------------------------------------------------------------------

const DBTC_DB_VERSION = 1;

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
    console.log('TIMESTAMP', timestamp, values.timestamp);
    console.log('DATE ACQUIRED', dateAcquired, values.dateAcquired);
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
    return {types, rules};
}

//-----------------------------------------------------------------------------
// All frags for a given user - joined with species
//-----------------------------------------------------------------------------

const SELECT_FRAGS_FOR_USER = `
    SELECT
        *,
        CASE WHEN frags.isAlive AND frags.fragsAvailable > 0
            THEN 1 ELSE 0 END AS isAvailable
    FROM
        mothers,
        frags
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

//-----------------------------------------------------------------------------

const SELECT_A_FRAG = `
    SELECT
        *,
        CASE WHEN frags.isAlive AND frags.fragsAvailable > 0
            THEN 1 ELSE 0 END AS isAvailable
    FROM
        mothers,
        frags
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

//-----------------------------------------------------------------------------

const SELECT_MOTHERS = `
    SELECT
        *
    FROM
        mothers
    ORDER BY
        name ASC
`;

function selectMothers() {
    return db.all(SELECT_MOTHERS);
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
            threadId
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
            $threadId
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
    picture: null,
    notes: null,
    threadId: null
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
        return fragId;
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

        // Decrement available frags on the source frag
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
        *,
        CASE WHEN frags.isAlive AND frags.fragsAvailable > 0
            THEN 1 ELSE 0 END AS isAvailable
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
    db.transaction(({run, all}) => {
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

const UPDATE_ALIVE = `
    UPDATE
        frags
    SET
        isAlive = 0,
        fragsAvailable = 0
    WHERE
        fragId = $fragId AND
        ownerId = ownerId
`;

function markAsDead(ownerId, fragId) {
    db.run(UPDATE_ALIVE, {fragId, ownerId});
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

//-----------------------------------------------------------------------------
// Select mothers that have frags alive, including:
//  an array of all the frags
//  an array of all the frag pictures (which can have nulls in it)
//-----------------------------------------------------------------------------
// Example row:
//
// motherId = 6
// timestamp = 2021-01-16T01:05:31.696Z
//      name = Armor Of God Zoa
//      type = Softie
// scientificName =
//      flow = Medium
//     light = Medium
// hardiness = Normal
// growthRate = Normal
// sourceType = Member
//    source = Srt4Eric
//      cost = 0.0
//      size =
//    owners = [
//              {"ownerId":16186,"fragId":10,"fragsAvailable":0},
//              {"ownerId":803,"fragId":11,"fragsAvailable":0},
//              {"ownerId":14245,"fragId":12,"fragsAvailable":0},
//              {"ownerId":13957,"fragId":13,"fragsAvailable":0},
//
//  Note that 16186 appears twice because someone else gave them a frag back
//
//              {"ownerId":16186,"fragId":14,"fragsAvailable":0}
//             ]
//  pictures = ["92dc15eff7cb74ba939806449b9fa88e",null,null,"a93b531dd1339e1dd14d18b907438191",null]
//-----------------------------------------------------------------------------

const SELECT_COLLECTION = `
    SELECT
        mothers.*,
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
`;

function selectCollection(userId) {
    const rows = db.all(SELECT_COLLECTION, {});
    // Now, go through them and parse the JSON parts
    rows.forEach((row) => {
        // Remove the null pictures
        row.pictures = JSON.parse(row.pictures).filter((picture) => picture);
        // Parse the owners and filter them
        row.owners = JSON.parse(row.owners).filter(({ownerId}) => {
            // If this owner is the same as the calling user, remove it
            // from the array.
            if (ownerId === userId) {
                // Mark the row with the fact that the calling user
                // owns it
                row.ownsIt = true;
                return false;
            }
            return true;
        })
        // Also sort the list in descending order by frags available,
        // so the ones with the most frags are first
        .sort((a, b) => b.fragsAvailable - a.fragsAvailable);
    });
    // Return only the ones that have at least one owner. This gets rid
    // of any that only userId owns - because those will be in their
    // collection and shouldn't be displayed here
    return rows.filter(({owners}) => owners.length > 0);
}

//-----------------------------------------------------------------------------

module.exports = {
    selectAllFragsForUser,
    selectMothers,
    insertItem,
    selectFrag,
    validateFrag,
    updateFragsAvailable,
    giveAFrag,
    addJournal,
    markAsDead,
    updateFragPicture,
    selectCollection,
    getTypes,
    getType,
    getEnums
}
