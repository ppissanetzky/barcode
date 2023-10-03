const assert = require('assert');

const express = require('express');
const multer = require('multer');
const {differenceInSeconds, differenceInMinutes} = require('date-fns');

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

const {dateFromIsoString, nowAsIsoString} = require('./dates');

const {lookupUser, startConversation} = require('./xenforo');

const db = require('./equipment-database');
const {makeEquipmentQueue} = require('./equipment-queue');

const {validatePhoneNumber, sendSms} = require('./aws');

const {later, uberPost, uberPm} = require('./forum');
const {renderMessage} = require('./messages');
const {logToForum} = require('./forum-log');

const {getNearest} = require('./places/distance');
const {getListOfPlaceNames} = require('./places/places');

const systemSettings = require('./system-settings');

const OTP_ENABLED = false;

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// To process multi-part posts
//-----------------------------------------------------------------------------

const upload = multer();

//-----------------------------------------------------------------------------
// Get a list of items with information about the user
//-----------------------------------------------------------------------------

router.get('/', async (req, res) => {
    const {user} = req;
    const {items, ban} = db.getAllItems(user.id);
    res.json({user, items, ban});
});

//-----------------------------------------------------------------------------
// This one returns the user, ban item and queue
//-----------------------------------------------------------------------------

router.get('/queue/:itemId', async (req, res, next) => {
    const {user, params: {itemId}} = req;
    const item = db.getItemForUser(itemId, user.id);
    if (!item) {
        return next(INVALID_EQUIPMENT());
    }
    const queue = await makeEquipmentQueue(itemId);
    const ban = db.getBan(user.id);
    res.json({user, ban, item, queue});
});

//-----------------------------------------------------------------------------
// Get information about the item
//-----------------------------------------------------------------------------

router.get('/item/:itemId', async (req, res, next) => {
    const {user, params: {itemId}} = req;
    const item = db.getItemForUser(itemId, user.id);
    if (!item) {
        return next(INVALID_EQUIPMENT());
    }
    res.json({user, item});
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
    // No OTP - we still insert a row in order to keep the phone number
    if (!OTP_ENABLED) {
        db.deleteOtp(user.id);
        db.insertOtp(user.id, phoneNumber, '0', now.toISOString());
        return res.json({});
    }

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
// This is the old version that is used to return the queue via JSON and
// takes an item object instead of an itemId. It now returns undefined if
// the item is invalid.
//-----------------------------------------------------------------------------

async function getQueue(item) {
    const queue = await makeEquipmentQueue(item.itemId);
    if (queue) {
        const {haves, waiters} = queue;
        return ({haves, waiters});
    }
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
        if (OTP_ENABLED) {
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
    // If the queue was empty before this (there's only 1 waiter now),
    // let the holders know about this exciting new development
    if (queue.waiters.length === 1 && queue.haves.length > 0) {
        // Collect all the recipients
        const recipients = [
            user.id,
            ...queue.haves.map(({userId}) => userId)
        ];
        // Send the PM
        uberPm(recipients, 'equipment-first-in-line-pm', {user, item});
    }
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
    // Lookup the users
    const fromUser = await lookupUser(source, true);
    const toUser = await lookupUser(dest, true);
    // The destination has to be in line but not have it
    if (!(destItem.inList && !destItem.hasIt)) {
        // Or can be a holder
        if (!toUser.canHoldEquipment) {
            return next(NOT_YOURS());
        }
    }
    // The destination cannot be banned
    if (db.getBan(dest)) {
        return next(BANNED());
    }
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

        // Do the rest of the work after the request is done
        later(async () => {
            // Get the haves and waiters from the queue
            const {haves, waiters} = queue;
            // This will be an array of the nearest waiters with distance
            // information or undefined if there is no distance info
            let distances;
            // Wrap this up in a try/catch because it is not strictly
            // necessary and we don't know whether it will be flaky or
            // not.
            try {
                // Get the location for this user from the queue
                const entry = haves.find(({userId}) => userId === user.id);
                const origin = entry?.location;
                if (origin) {
                    // Get the locations of all the waiters
                    const destinations = waiters.map(({location}) => location);
                    const nearest = await getNearest(origin, destinations);
                    if (nearest.length > 0) {
                        // Pick the first few according to this setting
                        const count = systemSettings.equipmentReadyCandidates;
                        distances = nearest.slice(0, count).map((distance) => ({
                            ...distance,
                            ...waiters[distance.index]
                        }));
                    }
                }
            }
            catch (error) {
                console.error('Failed to calculate distance :', error);
            }
            // Post that the user is done
            uberPost(item.threadId, 'equipment-available', {
                item, user, queue, distances});
            if (waiters.length > 0) {
                // Send a group PM to all the waiters
                const next = waiters.map(({user: {id}}) => id);
                // Collect all the recipients
                const recipients = [user.id, ...next];
                // Render the message
                const [title, body] = await renderMessage('equipment-ready-pm',
                    {user, item, distances});
                // Now start the conversation
                await startConversation(recipients, title, body);
            }
        });
    }

    // Return the queue
    res.json({queue});
});

//-----------------------------------------------------------------------------
// Return the list of potential recipients for an item
//-----------------------------------------------------------------------------

router.get('/recipients/:itemId', async (req, res, next) => {
    const {params: {itemId}} = req;
    const queue = await makeEquipmentQueue(itemId);
    // Make sure the item is valid
    if (!queue) {
        return next(INVALID_EQUIPMENT());
    }
    const recipients = await queue.getRecipients();
    res.json({recipients});
});

//-----------------------------------------------------------------------------
// Return a list of places
//-----------------------------------------------------------------------------

router.get('/places', (req, res) => {
    res.json({places: getListOfPlaceNames()});
});

//-----------------------------------------------------------------------------

module.exports = router;

/*
(async () => {
    const history = db.getHistoryForItem(1);
    for (const entry of history) {
        const {userId, days} = entry;
        const user = await lookupUser(userId, true);
        console.log(`${user.name},${user.canHoldEquipment ? 1 : 0},${days}`);
    }
})();
*/

