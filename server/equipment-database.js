const assert = require('assert');

const {Database} = require('./db');

const {dateFromIsoString, differenceInDays} = require('./dates');

//-----------------------------------------------------------------------------

const EQUIPMENT_DB_VERSION = 1;

const db = new Database('equipment', EQUIPMENT_DB_VERSION);

//-----------------------------------------------------------------------------

const SELECT_ITEMS = `
    SELECT
        items.*,
        CASE WHEN queue.userId IS NOT NULL THEN 1 ELSE 0 END AS inList,
        CASE WHEN queue.dateReceived IS NOT NULL THEN 1 ELSE 0 END AS hasIt
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

const SELECT_BAN = `SELECT * FROM bans WHERE userId = $userId`;

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

const SELECT_ITEM = `
    SELECT
        items.*,
        CASE WHEN queue.userId IS NOT NULL THEN 1 ELSE 0 END AS inList,
        CASE WHEN queue.dateReceived IS NOT NULL THEN 1 ELSE 0 END AS hasIt
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

const SELECT_QUEUE_ENTRY = `SELECT * FROM queue WHERE itemId = $itemId AND userId = $userId`;

function getQueueForUser(itemId, userId) {
    const [row] = db.all(SELECT_QUEUE_ENTRY, {itemId, userId});
    // Can be undefined
    return row;
}

//-----------------------------------------------------------------------------

const SELECT_OTP = `SELECT * FROM otp WHERE userId = $userId`;

function getOtp(userId) {
    const [row] = db.all(SELECT_OTP, {userId});
    // Can be undefined
    return row;
}

const DELETE_OTP = `DELETE FROM otp WHERE userId = $userId`;

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
        dateReceived
    )
    VALUES (
        $itemId,
        $timestamp,
        $userId,
        $phoneNumber,
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

function transferItem(itemId, fromUserId, toUserId) {
    db.transaction(({all, run}) => {
        const now = new Date();
        // First, we set the date received to now for
        // the recipient
        run(UPDATE_QUEUE, {
            itemId,
            userId: toUserId,
            dateReceived: now.toISOString()
        });
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
        const days = Math.max(Math.floor(differenceInDays(now, dateFromIsoString(isoStartDate))), 0)
        // Insert a history row
        run(INSERT_HISTORY, {
            itemId,
            userId: fromUserId,
            startDate: isoStartDate,
            days
        });
        // Finally, delete the source user's row from the queue
        run(DELETE_FROM_QUEUE, {
            itemId,
            userId: fromUserId
        });
    });
}

//-----------------------------------------------------------------------------

module.exports = {
    getAllItems,
    getItemForUser,
    getQueue,
    getQueueForUser,
    getBan,
    getOtp,
    deleteOtp,
    updateOtp,
    insertOtp,
    insertIntoQueue,
    removeFromQueue,
    transferItem
};