const assert = require('assert');

const {Database} = require('./db');

const {
    dateFromIsoString,
    differenceInDays,
    addDays
} = require('./dates');

//-----------------------------------------------------------------------------

const EQUIPMENT_DB_VERSION = 4;

const db = new Database('equipment', EQUIPMENT_DB_VERSION);

//-----------------------------------------------------------------------------

const SELECT_ITEMS = `
    SELECT
        items.*,
        CASE WHEN queue.userId IS NOT NULL THEN 1 ELSE 0 END AS inList,
        CASE WHEN queue.dateReceived IS NOT NULL THEN 1 ELSE 0 END AS hasIt,
        CASE WHEN queue.dateDone IS NOT NULL THEN 1 ELSE 0 END AS isAvailable
    FROM
        items
    LEFT OUTER JOIN
        queue
    ON
        items.itemId = queue.itemId AND
        queue.userId = $userId
    ORDER BY
        items.itemId
`;

const SELECT_BAN = 'SELECT * FROM bans WHERE userId = $userId';

function getAllItems(userId) {
    const items = db.all(SELECT_ITEMS, {userId});
    const [ban] = db.all(SELECT_BAN, {userId});
    return ({items, ban});
}

function getBan(userId) {
    const [ban] = db.all(SELECT_BAN, {userId});
    // Can be undefined
    return ban;
}

const SELECT_ALL_BANS = 'SELECT * FROM bans';

function getAllBans() {
    return db.all(SELECT_ALL_BANS, {});
}

const DELETE_BAN = 'DELETE FROM bans WHERE userId = $userId';

function deleteBan(userId) {
    db.run(DELETE_BAN, {userId});
}

function getFirstBanTierForItem(itemId) {
    return db.first(
        'SELECT * FROM banTiers WHERE itemId = $itemId ORDER BY tier LIMIT 1',
        {itemId});
}

const SELECT_ITEM = `
    SELECT
        items.*,
        CASE WHEN queue.userId IS NOT NULL THEN 1 ELSE 0 END AS inList,
        CASE WHEN queue.dateReceived IS NOT NULL THEN 1 ELSE 0 END AS hasIt,
        CASE WHEN queue.dateDone IS NOT NULL THEN 1 ELSE 0 END AS isAvailable
    FROM
        items
    LEFT OUTER JOIN
        queue
    ON
        items.itemId = queue.itemId AND
        queue.userId = $userId
    WHERE
        items.itemId = $itemId
`;

function getItemForUser(itemId, userId) {
    const [row] = db.all(SELECT_ITEM, {userId, itemId});
    // Can be undefined
    return row;
}

function getItem(itemId) {
    // Can be undefined
    return getItemForUser(itemId, null);
}

//-----------------------------------------------------------------------------

const SELECT_QUEUE = `
    SELECT
        *
    FROM
        queue
    WHERE
        itemId = $itemId
    ORDER BY
        strftime('%s', dateReceived),
        strftime('%s', timestamp)
`;

function getQueue(itemId) {
    return db.all(SELECT_QUEUE, {itemId});
}

// Used by this one and also transfers below

const SELECT_QUEUE_ENTRY = 'SELECT * FROM queue WHERE itemId = $itemId AND userId = $userId';

function getQueueForUser(itemId, userId) {
    const [row] = db.all(SELECT_QUEUE_ENTRY, {itemId, userId});
    // Can be undefined
    return row;
}

//-----------------------------------------------------------------------------

const SELECT_OTP = 'SELECT * FROM otp WHERE userId = $userId';

function getOtp(userId) {
    const [row] = db.all(SELECT_OTP, {userId});
    // Can be undefined
    return row;
}

const DELETE_OTP = 'DELETE FROM otp WHERE userId = $userId';

function deleteOtp(userId) {
    db.run(DELETE_OTP, {userId});
}

const UPDATE_OTP = `
    UPDATE
        otp
    SET
        count = count + 1,
        sent = $sent
    WHERE
        userId = $userId
`;

function updateOtp(userId, sent) {
    db.run(UPDATE_OTP, {userId, sent});
}

const INSERT_OTP = `
    INSERT INTO otp (
        userId,
        otp,
        phoneNumber,
        created,
        sent,
        count
    )
    VALUES (
        $userId,
        $otp,
        $phoneNumber,
        $created,
        $created,  -- sent is the same as created
        1          -- first send
    )
`;

function insertOtp(userId, phoneNumber, otp, created) {
    db.run(INSERT_OTP, {userId, phoneNumber, otp, created});
}

//-----------------------------------------------------------------------------

const INSERT_QUEUE = `
    INSERT INTO queue (
        itemId,
        timestamp,
        userId,
        phoneNumber,
        dateReceived,
        location,
        dateDone
    )
    VALUES (
        $itemId,
        $timestamp,
        $userId,
        $phoneNumber,
        NULL,
        $location,
        NULL
    )
`;

function insertIntoQueue(values) {
    db.run(INSERT_QUEUE, values);
}

// Used here and for transfering an item

const DELETE_FROM_QUEUE = `
    DELETE FROM
        queue
    WHERE
        itemId = $itemId AND
        userId = $userId
`;

function removeFromQueue(itemId, userId) {
    db.run(DELETE_FROM_QUEUE, {itemId, userId});
}

//-----------------------------------------------------------------------------

function updateDone(itemId, userId) {
    const UPDATE_DONE = `
        UPDATE queue
        SET dateDone = $dateDone
        WHERE
            itemId = $itemId AND
            userId = $userId AND
            dateDone IS NULL
        `;
    const now = new Date();
    db.run(UPDATE_DONE, {
        itemId,
        userId,
        dateDone: now.toISOString()
    });
}

//-----------------------------------------------------------------------------

const IS_IN_QUEUE = `
    SELECT
        userId
    FROM
        queue
    WHERE
        itemId = $itemId AND
        userId = $userId
`;

const INSERT_HOLDER = `
    INSERT INTO queue (
        itemId,
        timestamp,
        userId,
        phoneNumber,
        dateReceived,
        location,
        dateDone
    )
    VALUES (
        $itemId,
        $timestamp,
        $userId,
        NULL,
        $timestamp,
        $location,
        $timestamp
    )
`;

const UPDATE_QUEUE = `
    UPDATE
        queue
    SET
        dateReceived = $dateReceived
    WHERE
        itemId = $itemId AND
        userId = $userId
`;

const INSERT_HISTORY = `
    INSERT INTO history (
        itemId,
        userId,
        startDate,
        days
    )
    VALUES (
        $itemId,
        $userId,
        $startDate,
        $days
    )
`;

const SELECT_BAN_TIER = `
    SELECT
        *
    FROM
        banTiers
    WHERE
        itemId = $itemId AND
        $days > afterDays
    ORDER BY
        tier DESC
    LIMIT
        1
`;

const INSERT_BAN = `
    INSERT INTO bans (
        userId,
        type,
        reason,
        issuedBy,
        startedOn,
        endsOn
    )
    VALUES (
        $userId,
        $type,
        $reason,
        $issuedBy,
        $startedOn,
        $endsOn
    )
`;

function addBan(values) {
    db.run(INSERT_BAN, values);
}

function transferItem(itemId, fromUserId, toUserId, exemptFromBans) {
    return db.transaction(({all, run, first}) => {
        const now = new Date();
        // It is possible that the target userId is not in the queue
        const isInQueue = first(IS_IN_QUEUE, {
            itemId,
            userId: toUserId
        });
        // If the user is already in the queue, update the
        // date received
        if (isInQueue) {
            // Now, we set the date received to now for
            // the recipient
            run(UPDATE_QUEUE, {
                itemId,
                userId: toUserId,
                dateReceived: now.toISOString()
            });
        }
        // Otherwise, we have to insert the user into the queue
        // We set the timestamp, datReceived and dateDone to now.
        // We use the location from the holders table
        else {
            // The user must be a holder
            const holder = getHolder(toUserId);
            assert(holder);
            const {location} = holder;
            // Insert them into the queue
            run(INSERT_HOLDER, {
                itemId,
                timestamp: now.toISOString(),
                userId: toUserId,
                location
            });
        }
        // Now, get the dateReceived for the giver
        const [fromEntry] = all(SELECT_QUEUE_ENTRY, {
            itemId,
            userId: fromUserId
        });
        // It should be there
        assert(fromEntry);
        // Get the date that user got it
        const isoStartDate = fromEntry.dateReceived;
        assert(isoStartDate);
        // Get the number of days they had it
        const days = Math.max(differenceInDays(now, dateFromIsoString(isoStartDate)), 0);
        // Insert a history row
        run(INSERT_HISTORY, {
            itemId,
            userId: fromUserId,
            startDate: isoStartDate,
            days
        });
        // Delete the source user's row from the queue
        run(DELETE_FROM_QUEUE, {
            itemId,
            userId: fromUserId
        });
        // See if a ban applies
        if (!exemptFromBans) {
            // See if there is an existing ban for this user
            const [existingBan] = all(SELECT_BAN, {
                userId: fromUserId
            });
            if (existingBan) {
                return existingBan;
            }
            const [banTier] = all(SELECT_BAN_TIER, {itemId, days});
            if (banTier) {
                const {banDays} = banTier;
                const ban = {
                    userId: fromUserId,
                    type: 'automatic',
                    reason: `Kept item ${itemId} for ${days} days from ${isoStartDate}`,
                    issuedBy: 16211, // BARCODE
                    startedOn: now.toISOString(),
                    endsOn: addDays(now, banDays).toISOString()
                };
                run(INSERT_BAN, ban);
                // Return the ban to let the caller know
                return ban;
            }
        }
    });
}

//-----------------------------------------------------------------------------

const SELECT_ITEM_FOR_THREAD = 'SELECT * FROM items WHERE threadId = $threadId';

function getItemForThread(threadId) {
    const [row] = db.all(SELECT_ITEM_FOR_THREAD, {threadId});
    // Can be undefined
    return row;
}

//-----------------------------------------------------------------------------

function getHistoryForItem(itemId) {
    const SELECT_HISTORY = 'SELECT * FROM history WHERE itemId = $itemId';
    return db.all(SELECT_HISTORY, {itemId});
}

//-----------------------------------------------------------------------------

function getHolders() {
    const SELECT_HOLDERS = 'SELECT userId, location FROM holders';
    return db.all(SELECT_HOLDERS);
}

function getHolder(userId) {
    const SELECT_HOLDER = 'SELECT userId, location FROM holders WHERE userId = $userId';
    return db.first(SELECT_HOLDER, {userId});
}

//-----------------------------------------------------------------------------

module.exports = {
    database: db,
    getAllItems,
    getItem,
    getItemForUser,
    getQueue,
    getQueueForUser,
    getBan,
    addBan,
    getOtp,
    deleteOtp,
    updateOtp,
    insertOtp,
    insertIntoQueue,
    removeFromQueue,
    transferItem,
    getAllBans,
    deleteBan,
    getItemForThread,
    getFirstBanTierForItem,
    updateDone,
    getHistoryForItem,
    getHolders,
    getHolder
};
