const {differenceInDays, formatDistance} = require('date-fns');

const {age, dateFromIsoString} = require('./dates');
const db = require('./equipment-database');
const {lookupUser} = require('./xenforo');

//-----------------------------------------------------------------------------

class EquipmentQueue {

    constructor(haves, waiters) {
        this.haves = haves;
        this.waiters = waiters;
    }

    toJSON() {
        return {
            haves: this.haves,
            waiters: this.waiters
        };
    }

    hasIt(userId) {
        return this.haves.some((entry) => entry.userId === userId);
    }

    isWaiting(userId) {
        return this.waiters.some((entry) => entry.userId === userId);
    }

    //-------------------------------------------------------------------------
    // Returns the list of users that can potentially receive the item,
    // including those that are in the equipment holders table
    //-------------------------------------------------------------------------

    async getRecipients() {
        const recipients = this.waiters.map(({user}) => user);
        const holders = db.getHolders();
        for (const {userId} of holders) {
            if (!this.hasIt(userId) && !this.isWaiting(userId)) {
                const user = await lookupUser(userId);
                if (user && user.canHoldEquipment) {
                    user.holder = true;
                    recipients.push(user);
                }
            }
        }
        return recipients;
    }
}

//-----------------------------------------------------------------------------

async function makeEquipmentQueue(itemId) {
    const now = new Date();
    const item = db.getItem(itemId);
    if (!item) {
        return;
    }
    const queue = db.getQueue(itemId);
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
        // Or, the opposite
        else {
            entry.location = entry.user.location;
        }
        // If that user has the item
        const {dateReceived, dateDone, timestamp} = entry;
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
            entry.ageAvailable = dateDone
                ? age(dateDone, 'less than a day')
                : '';
            haves.push(entry);
        }
        else {
            entry.daysWaiting = Math.floor(differenceInDays(now, dateFromIsoString(timestamp)));
            entry.ageWaiting = age(timestamp, 'less than a day');
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
            entry.eta = wait <= 1 ? 'soon' : `in ${formatDistance(date, now)}`;
            // Now, push that wait plus max days
            waits.push(wait + item.maxDays);
        });
    }
    return new EquipmentQueue(haves, waiters);
}

//-----------------------------------------------------------------------------

module.exports = {
    makeEquipmentQueue
};
