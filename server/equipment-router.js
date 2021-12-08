const assert = require('assert');

const express = require('express');
const multer = require('multer');
const {differenceInSeconds, differenceInMinutes, differenceInDays, formatDistance} = require('date-fns');

const {
    INVALID_EQUIPMENT,
    INVALID_PHONE_NUMBER,
    OTP_TOO_SOON,
    OTP_TOO_OLD,
    NO_OTP,
    IN_QUEUE,
    NOT_IN_QUEUE,
    CANT_DROP_OUT,
    BANNED,
    BAD_TRANSFER,
    NOT_YOURS
} = require('./errors');

const {age, dateFromIsoString, nowAsIsoString} = require('./dates');

const {lookupUser, startConversation} = require('./xenforo');

const db = require('./equipment-database');

const {validatePhoneNumber, sendSms} = require('./aws');

const {uberPost} = require('./forum');
const {renderMessage} = require('./messages');
const {logToForum} = require('./forum-log');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// To process multi-part posts
//-----------------------------------------------------------------------------

const upload = multer();

//-----------------------------------------------------------------------------

router.get('/', async (req, res) => {
    const {user} = req;
    const {items, ban} = db.getAllItems(user.id);
    res.json({user, items, ban});
});

//-----------------------------------------------------------------------------

router.get('/:itemId', async (req, res) => {
    const {params: {itemId}} = req;
    const queue = db.getQueue(itemId);
    await Promise.all(queue.map(async (entry) => {
        entry.user = await lookupUser(entry.userId, true);
    }));
    res.json({queue});
});

//-----------------------------------------------------------------------------
// The number of digits in the OTP
//-----------------------------------------------------------------------------

const OTP_LENGTH = 6;

//-----------------------------------------------------------------------------
// If the caller attempts to send an OTP when another was sent less than
// this many seconds ago, we will return an error
//-----------------------------------------------------------------------------

const OTP_MIN_SEND_SECONDS = 25;

//-----------------------------------------------------------------------------
// How long to keep an OTP in the database for
//-----------------------------------------------------------------------------

const OTP_MAX_AGE_MINUTES = 15;

//-----------------------------------------------------------------------------
// https://www.geeksforgeeks.org/javascript-program-to-generate-one-time-password-otp/
//-----------------------------------------------------------------------------

function generateOTP() {
    // Declare a digits variable
    // which stores all digits
    const digits = '123456789';
    let OTP = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
        OTP += digits[Math.floor(Math.random() * digits.length)];
    }
    return OTP;
}

//-----------------------------------------------------------------------------

async function sendOtp(phoneNumber, otp) {
    await sendSms(phoneNumber,
        `Your BARcode verification code is ${otp.substr(0, 3)} ${otp.substr(3, 3)}. It is valid for ${OTP_MAX_AGE_MINUTES} minutes.`);
}

//-----------------------------------------------------------------------------
// True if an OTP row from the database is too old
//-----------------------------------------------------------------------------

function isOtpOld(row) {
    assert(row);
    // See how long it has been in the database
    const age = differenceInMinutes(new Date(), dateFromIsoString(row.created));
    // If it has been there too long, we're going to delete it and
    // start over by falling through
    if (age >= OTP_MAX_AGE_MINUTES) {
        console.log('OTP is too old :', row);
        return true;
    }
    return false;
}

//-----------------------------------------------------------------------------
// This generates and sends an OTP. It is not specific to an item, it is
// bound to the calling user. It requires the user and a phone number.
//-----------------------------------------------------------------------------

router.post('/otp', upload.none(), async (req, res, next) => {
    const {user, body: {phoneNumber}} = req;
    // Make sure the phone number is good
    if (!validatePhoneNumber(phoneNumber)) {
        return next(INVALID_PHONE_NUMBER());
    }
    // Right here, right now
    const now = new Date();
    // See if there is an existing row for this user
    const existing = db.getOtp(user.id);
    if (existing) {
        if (isOtpOld(existing)) {
            // Delete it and fall through
            db.deleteOtp(user.id);
        }
        else {
            // See how many seconds ago it was sent
            const seconds = differenceInSeconds(now, dateFromIsoString(existing.sent));
            // If it is too soon to send another, generate an error to
            // protect the API from being abused
            if (seconds < OTP_MIN_SEND_SECONDS) {
                console.log('Last OTP was', seconds, 'seconds ago, returning error');
                return next(OTP_TOO_SOON());
            }
            // If it is the same phone number, we're going to send the
            // same OTP again.
            if (existing.phoneNumber === phoneNumber) {
                console.log('Phone number is the same, re-sending same OTP');
                const response = {};
                // Update the database first and then send it
                db.updateOtp(user.id, now.toISOString());
                // Now, send the same OTP code
                try {
                    await sendOtp(phoneNumber, existing.otp);
                }
                catch (error) {
                    console.error('Failed to send OTP :', error);
                    response.failed = true;
                }
                return res.json(response);
            }
            // Otherwise, it is a new phone number, so we delete the existing
            // row and proceed as if there is nothing in the database
            console.log('Phone number changed, deleting OTP');
            db.deleteOtp(user.id);
        }
    }
    // If we get here, there should be no existing OTP in the database
    assert(!db.getOtp(), 'Should not have an OTP in the database');
    // Let's generate the OTP
    const otp = generateOTP();
    // Put it in the database
    db.insertOtp(user.id, phoneNumber, otp, now.toISOString());
    // Send it
    const response = {};
    try {
        console.log('Sending new OTP to', phoneNumber);
        await sendOtp(phoneNumber, otp);
    }
    catch (error) {
        console.error('Failed to send OTP :', error);
        response.failed = true;
    }
    res.json(response);
});

//-----------------------------------------------------------------------------
// Gets the queue and splits it into 'haves' and 'waiters'. Augments it with
// age and eta
//-----------------------------------------------------------------------------

async function getQueue(item) {
    const now = new Date();
    const queue = db.getQueue(item.itemId);
    const haves = [];
    const waiters = [];
    await Promise.all(queue.map(async (entry) => {
        // Look up the user
        entry.user = await lookupUser(entry.userId, true);
    }));
    // Now, augment it
    queue.forEach((entry) => {
        // Remove the phone number, it's only for the server
        delete entry.phoneNumber;
        // Use our location for the user if we have one
        if (entry.location) {
            entry.user.location = entry.location;
        }
        // If that user has the item
        const {dateReceived, dateDone} = entry;
        if (dateReceived) {
            entry.hasIt = true;
            entry.age = age(dateReceived, 'less than a day');
            entry.days = Math.floor(differenceInDays(now, dateFromIsoString(dateReceived)));
            // If this user can hold equipment indefinitely, we don't mark
            // it as overdue. That's where equipment is held when no one is in line
            entry.overdue = !entry.user.canHoldEquipment && entry.days > item.maxDays;
            entry.isAvailable = Boolean(dateDone);
            entry.daysAvailable = dateDone
                ? Math.floor(differenceInDays(now, dateFromIsoString(dateDone)))
                : 0;
            haves.push(entry);
        }
        else {
            waiters.push(entry);
        }
    });
    // Calculate the expected days until each waiting user gets it
    // First, fill out an array with the number of days until each user that
    // has it will pass it on - based on the item's maxDays. If that user has
    // marked it as available, use 0 days
    // Sort it so so the shortest wait is first.
    const waits = haves.map(({days, isAvailable}) =>
        isAvailable ? 0 : Math.max(item.maxDays - days, 0)).sort();
    // Now, we iterate over all the users waiting. For each one, we
    // get the first item from the waits array - that's how long it will
    // take. Then, we push that wait plus maxDays into the back of the array
    // because that's how long that waiting user will have it for.
    if (waits.length > 0) {
        waiters.forEach((entry) => {
            const wait = waits.shift();
            const date = new Date();
            date.setDate(date.getDate() + wait);
            entry.eta = wait < 1 ? 'soon' : `in ${formatDistance(date, now)}`;
            // Now, push that wait plus max days
            waits.push(wait + item.maxDays);
        });
    }
    return ({haves, waiters});
}

//-----------------------------------------------------------------------------
// Posting to the queue means this user is getting in line. It requires the
// item ID, the user and the OTP. It verifies the OTP.
//-----------------------------------------------------------------------------

router.post('/queue/:itemId', upload.none(), async (req, res, next) => {
    const {user, params: {itemId}, body: {otp, location}} = req;
    // Make sure the item is valid
    const item = db.getItemForUser(itemId, user.id);
    if (!item) {
        return next(INVALID_EQUIPMENT());
    }
    // Make sure the user is not already in the list
    if (item.inList) {
        return next(IN_QUEUE());
    }
    // Make sure this user is not banned
    const banned = db.getBan(user.id);
    if (banned) {
        return next(BANNED());
    }
    // If this user can hold equipment, we're not going to bother
    // with the OTP
    let phoneNumber = null;
    if (!user.canHoldEquipment) {
        // Get the OTP from the database
        const existing = db.getOtp(user.id);
        // If it is not there, bail
        if (!existing) {
            return next(NO_OTP());
        }
        // If it is too old, delete it and bail
        if (isOtpOld(existing)) {
            db.deleteOtp(user.id);
            return next(OTP_TOO_OLD());
        }
        // If there isn't an OTP in the request, also a hard error
        if (!otp) {
            return next(NO_OTP());
        }
        // If the OTP given does not match the one in the
        // database, that is a soft error, could be a typo that
        // can be corrected by trying again
        if (otp !== existing.otp) {
            return res.json({incorrect: true});
        }
        // Grab the phone number from the OTP row
        phoneNumber = existing.phoneNumber;
    }
    // Now, everything is in order, we can add the user to the queue
    db.insertIntoQueue({
        itemId,
        timestamp: nowAsIsoString(),
        userId: user.id,
        phoneNumber,
        location
    });
    // And we can delete the OTP
    db.deleteOtp(user.id);
    // Get the new queue
    const queue = await getQueue(item);
    // Post to the forum
    uberPost(item.threadId, 'equipment-got-in-line', {item, user, queue});
    // Return the queue
    res.json({queue});
});

//-----------------------------------------------------------------------------
// Deleting from the queue means that this user is dropping out of the list
//-----------------------------------------------------------------------------

router.delete('/queue/:itemId', async (req, res, next) => {
    const {user, params: {itemId}} = req;
    // Make sure the item is valid
    const item = db.getItemForUser(itemId, user.id);
    if (!item) {
        return next(INVALID_EQUIPMENT());
    }
    // Make sure the user is in the list
    if (!item.inList) {
        return next(NOT_IN_QUEUE());
    }
    // Make sure the user doesn't have it
    if (item.hasIt) {
        return next(CANT_DROP_OUT());
    }
    // Delete the row
    db.removeFromQueue(itemId, user.id);
    // Get the latest queue
    const queue = await getQueue(item);
    // Post to the forum
    uberPost(item.threadId, 'equipment-dropped-from-line', {item, user, queue});
    // Respond
    res.json({queue});
});

//-----------------------------------------------------------------------------
// This moves the item from one user to another
//-----------------------------------------------------------------------------

router.put('/queue/:itemId/:verb/:otherUserId', async (req, res, next) => {
    const {user, params: {itemId, verb, otherUserId}} = req;
    // Figure out the user that is giving it away and the user that is
    // receiving the item. It depends on the 'verb'
    let source;
    let dest;
    switch (verb) {
        // 'from' means that the calling user is getting it from the other user
        case 'from':
            source = otherUserId;
            dest = user.id;
            break;
        // 'to' means that the calling user is giving it to the other user
        case 'to':
            source = user.id;
            dest = otherUserId;
            break;
        // Otherwise it is a bad call
        default:
            return next(BAD_TRANSFER());
    }
    // Now, make sure everything is in order
    const sourceItem = db.getItemForUser(itemId, source);
    // The item has to be valid
    if (!sourceItem) {
        return next(INVALID_EQUIPMENT());
    }
    // And the source user has to have it
    if (!sourceItem.hasIt) {
        return next(NOT_YOURS());
    }
    const destItem = db.getItemForUser(itemId, dest);
    if (!destItem) {
        return next(INVALID_EQUIPMENT());
    }
    // The destination has to be in line but not have it
    if (!(destItem.inList && !destItem.hasIt)) {
        return next(NOT_YOURS());
    }
    // The destination cannot be banned
    if (db.getBan(dest)) {
        return next(BANNED());
    }
    // Lookup the users
    const fromUser = await lookupUser(source, true);
    const toUser = await lookupUser(dest, true);
    // OK, everything is good, move it and see if that resulted
    // in the source user being banned. Users that can hold
    // equipment are exempt from bans
    const ban = db.transferItem(itemId, source, dest, fromUser.canHoldEquipment);
    if (ban) {
        console.log('BAN', ban);
        const until = dateFromIsoString(ban.endsOn).toLocaleDateString();
        const [title, message] = await renderMessage('equipment-banned-pm',
            {item: sourceItem, user: fromUser, until});
        // Send the source user a PM to let them know they have been banned
        startConversation([source], title, message, true);
        // Log activity
        logToForum(`@${fromUser.name} has been banned from borrowing equipment until ${until}`);
    }
    // And return the new queue and ban
    const queue = await getQueue(sourceItem);
    // Post that the item has been passed
    uberPost(sourceItem.threadId, 'equipment-passed', {item: sourceItem, fromUser, toUser, queue});
    // Return the new queue and the ban if it is for the caller
    res.json({
        queue,
        ban: (ban && ban.userId === user.id) ? ban : null
    });
});

//-----------------------------------------------------------------------------
// This one just returns the queue for the given item
//-----------------------------------------------------------------------------

router.get('/queue/:itemId', async (req, res, next) => {
    const {user, params: {itemId}} = req;
    // Make sure the item is valid
    const item = db.getItemForUser(itemId, user.id);
    if (!item) {
        return next(INVALID_EQUIPMENT());
    }
    // Get the latest queue
    const queue = await getQueue(item);
    // Respond
    res.json({queue});
});

//-----------------------------------------------------------------------------
// This one lets the user that has the item start a conversation with the
// next few people in line
//-----------------------------------------------------------------------------

router.put('/conversation/:itemId', async (req, res, next) => {
    const {user, params: {itemId}} = req;
    // Make sure the item is valid
    const item = db.getItemForUser(itemId, user.id);
    if (!item) {
        return next(INVALID_EQUIPMENT());
    }
    // Make sure this user has the item
    if (!item.hasIt) {
        return next(NOT_YOURS());
    }
    // Get the waiters
    const {waiters} = await getQueue(item);
    if (waiters.length > 0) {
        // Pick up the first 5 (or less) user IDs
        const next = waiters.slice(0, 5).map(({user: {id}}) => id);
        // Collect all the recipients
        const recipients = [user.id, ...next];
        // Render the message
        const [title, body] = await renderMessage('equipment-ready-pm', {user, item});
        // Now start the conversation
        await startConversation(recipients, title, body);
    }
    res.status(200).end();
});

//-----------------------------------------------------------------------------
// When a user is done with an item
//-----------------------------------------------------------------------------

router.put('/done/:itemId', async (req, res, next) => {
    const {user, params: {itemId}} = req;
    // Make sure the item is valid
    const item = db.getItemForUser(itemId, user.id);
    if (!item) {
        return next(INVALID_EQUIPMENT());
    }
    // Make sure this user has the item
    if (!item.hasIt) {
        return next(NOT_YOURS());
    }
    // Get the queue
    let queue = await getQueue(item);
    // Only proceed if it is not already available, otherwise do nothing
    if (!item.isAvailable) {
        // Mark it as done now
        db.updateDone(itemId, user.id);
        // Get the queue again
        queue = await getQueue(item);
        // Post that the user is done
        uberPost(item.threadId, 'equipment-available', {item, user, queue});
        // Get the waiters
        const {waiters} = queue;
        if (waiters.length > 0) {
            // Send a group PM to all the waiters
            const next = waiters.map(({user: {id}}) => id);
            // Collect all the recipients
            const recipients = [user.id, ...next];
            // Render the message
            const [title, body] = await renderMessage('equipment-ready-pm', {user, item});
            // Now start the conversation
            await startConversation(recipients, title, body);
        }
    }

    // Return the queue
    res.json({queue});
});

//-----------------------------------------------------------------------------

module.exports = router;

