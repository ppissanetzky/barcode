
const {Database} = require('./db');

//-----------------------------------------------------------------------------

const DBTC_DB_VERSION = 1;

const db = new Database('dbtc', DBTC_DB_VERSION);

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

const INSERT_ITEM_NULLABLE_VALUES = {
    scientificName: null,
    sourceType: null,
    source: null,
    size: null,
    picture: null,
    notes: null
};

function insertItem(values) {
    return db.transaction(({run}) => {
        const bindings = {
            ...INSERT_ITEM_NULLABLE_VALUES,
            ...values
        };
        const motherId = run(INSERT_MOTHER, bindings);
        console.log('MOTHER ID', motherId);
        const fragBindings = {
            ...bindings,
            motherId
        };
        console.log(fragBindings);
        const fragId = run(INSERT_FRAG, fragBindings);
        return fragId;
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
        fragsAvailable = $fragsAvailable
    WHERE
        fragId = $fragId AND
        ownerId = $ownerId
`;

function updateFragsAvailable(ownerId, fragId, fragsAvailable) {
    db.run(UPDATE_FRAGS_AVAILABLE, {
        fragId,
        ownerId,
        fragsAvailable
    });
}

// //-----------------------------------------------------------------------------

module.exports = {
    selectAllFragsForUser,
    selectMothers,
    insertItem,
    selectFrag,
    validateFrag,
    updateFragsAvailable
}
