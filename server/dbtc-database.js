
const path = require('path');

const {Database} = require('./db');

const db = new Database(path.join(__dirname, 'database', 'dbtc.sqlite3'));

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

async function selectAllFragsForUser(user) {
    return await db.all(SELECT_FRAGS_FOR_USER, {$userId: user.id});
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

async function selectFrag(fragId) {
    const bindings = {
        $fragId: fragId
    };
    const [[frag], journals] = await Promise.all([
        await db.all(SELECT_A_FRAG, bindings),
        await db.all(SELECT_FRAG_JOURNALS, bindings)
    ]);
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

async function selectMothers() {
    return db.all(SELECT_MOTHERS);
}

//-----------------------------------------------------------------------------

const INSERT_MOTHER = `
    INSERT INTO mothers
        (
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
            size
        )
    VALUES
        (
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
            $size
        )
`;

const INSERT_FRAG = `
    INSERT INTO frags
        (
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
            $motherId,
            $ownerId,
            $dateAcquired,
            $picture,
            $notes,
            NULL,
            $fragsAvailable,
            1
        )
`;

const MOTHER_COLUMNS = new Set([
    'name', 'type', 'scientificName', 'flow', 'light', 'hardiness', 'growthRate',
    'sourceType', 'source', 'cost', 'size'
]);

const FRAG_COLUMNS = new Set([
    'motherId',
    'ownerId',
    'dateAcquired',
    'picture',
    'notes',
    'fragsAvailable'
]);

async function insertItem(values) {
    // TODO: should be done in a transaction
    const motherBindings = Object.keys(values).reduce((result, key) => {
        if (MOTHER_COLUMNS.has(key)) {
            result[`$${key}`] = values[key];
        }
        return result;
    }, {});
    console.log(motherBindings);
    const motherId = await db.run(INSERT_MOTHER, motherBindings);
    console.log('MOTHER ID', motherId);

    const fragBindings = Object.keys(values).reduce((result, key) => {
        if (FRAG_COLUMNS.has(key)) {
            result[`$${key}`] = values[key];
        }
        return result;
    }, {});
    fragBindings['$motherId'] = motherId;
    console.log(fragBindings);

    const fragId = await db.run(INSERT_FRAG, fragBindings);
    return fragId;
}

// //-----------------------------------------------------------------------------
// // Select everything about a frag given parameters - to validate the frag
// //-----------------------------------------------------------------------------

// const SELECT_VALID_FRAG = `
//     SELECT
//         species.species_id          AS species_id,
//         species.name                AS species_name,
//         species.type                AS species_type,
//         species.scientific_name     AS species_scientific_name,
//         species.notes               AS species_notes,

//         frags.frag_id               AS frag_id,
//         frags.date_acquired         AS date_acquired,
//         frags.picture               AS picture,
//         frags.notes                 AS notes,
//         frags.frag_of               AS frag_of,
//         frags.frags_available       AS frags_available,
//         frags.is_alive              AS is_alive,

//         CASE WHEN frags.is_alive AND frags.frags_available > 0
//             THEN 1 ELSE 0 END AS is_available
//     FROM
//         frags,
//         species
//     WHERE
//         frags.frag_id           = $frag_id AND
//         frags.is_alive          = $is_alive AND
//         frags.frags_available   > $frags_available AND
//         frags.owner             = $owner AND
//         frags.species_id        = species.species_id
// `;

// // Returns undefined if the frag is not valid. Otherwise, returns
// // the one and only row

// async function validateFrag(owner, fragId, isAlive, fragsAvailable) {
//     const rows = await db.all(SELECT_VALID_FRAG, {
//         $frag_id: fragId,
//         $is_alive: isAlive ? 1 : 0,
//         $frags_available: fragsAvailable,
//         $owner: owner.id
//     });
//     const [frag] = rows;
//     return frag;
// }

// //-----------------------------------------------------------------------------
// // Given an owner, frag ID and increment, add the increment to frags_available
// // Note that the increment can be negative to decrease the number of frags.
// //-----------------------------------------------------------------------------

// const UPDATE_FRAGS_AVAILABLE = `
//     UPDATE
//         frags
//     SET
//         frags_available = frags_available + $increment
//     WHERE
//         frag_id = $frag_id AND
//         owner = $owner
// `;

// async function updateFragsAvailable(owner, fragId, increment) {
//     await db.run(UPDATE_FRAGS_AVAILABLE, {
//         $frag_id: fragId,
//         $owner: owner.id,
//         $increment: increment
//     });
// }

// //-----------------------------------------------------------------------------

module.exports = {
    selectAllFragsForUser,
    selectMothers,
    insertItem,
    selectFrag
}
