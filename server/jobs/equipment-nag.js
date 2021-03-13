
const {lock} = require('../lock');
const db = require('../equipment-database');
const {dateFromIsoString, differenceInDays} = require('../dates');
const {lookupUser, getUserEmailAddress, startConversation} = require('../xenforo');
const {renderMessage} = require('../messages');
const {sendSms} = require('../aws');
const {logToForum} = require('../forum-log');

//-----------------------------------------------------------------------------

async function alert(item, entry, days) {
    const {dateReceived, userId, phoneNumber} = entry;
    // Lookup the user
    const user = await lookupUser(userId, true);
    // If the user can hold equipment, we don't alert
    if (user.canHoldEquipment) {
        return;
    }
    // Log
    console.log('Will alert', user.name, dateReceived, days, 'days');

    logToForum(`@${user.name} has had the ${item.shortName} for ${days} days`);

    //-------------------------------------------------------------------------
    // If they have a phone number, we will send a text
    //-------------------------------------------------------------------------
    if (phoneNumber) {
        try {
            const [, message] = await renderMessage('overdue-equipment-sms', {item, user, days});
            await sendSms(phoneNumber, message);
            console.log('Sent alert via SMS to', phoneNumber);
            logToForum(`Notified @${user.name} via SMS`);
        }
        catch (error) {
            console.error('Failed to send SMS alert', user.name, phoneNumber, error);
            logToForum(`Failed to notify @${user.name} via SMS`);
        }
    }

    //-------------------------------------------------------------------------
    // Try email
    //-------------------------------------------------------------------------
    try {
        const email = await getUserEmailAddress(userId);
        console.log(email);
        // TODO: figure out AWS SES
    }
    catch (error) {
        console.error('Failed to send e-mail alert', user.name, error);
    }

    //-------------------------------------------------------------------------
    // Try a PM which may also send an e-mail
    //-------------------------------------------------------------------------
    try {
        const [title, message] = await renderMessage('overdue-equipment-pm', {item, user, days});
        await startConversation([userId], title, message, true);
        console.log('PM sent');
        logToForum(`Notified @${user.name} via PM`);
    }
    catch (error) {
        console.error('Failed to send PM to', user.name, error);
        logToForum(`Failed to notify @${user.name} via PM`);
    }
}

//-----------------------------------------------------------------------------

lock('equipment-nag', async () => {
    const now = new Date();
    // Get all the items, using 0 as the user ID because we don't care
    // about caller-specific information
    const {items} = db.getAllItems(0);
    // Iterate over them
    for (const item of items) {
        const {itemId, alertStartDay} = item;
        // If this item is set to not alert, we skip the queue
        if (!alertStartDay) {
            continue;
        }
        // Get the queue for this item
        const queue = db.getQueue(itemId);
        // Iterate over the queue
        for (const entry of queue) {
            // Get the date received
            const {dateReceived} = entry;
            // If it is not there, this user is waiting
            if (!dateReceived) {
                continue;
            }
            // Otherwise, the user has it, so figure out how many days
            const days = differenceInDays(now, dateFromIsoString(dateReceived));
            // Not enough time to start sending alerts
            if (days < alertStartDay) {
                continue;
            }
            // Alert
            await alert(item, entry, days);
        }
    }
    // Now, delete expired bans
    const bans = db.getAllBans();
    for (const ban of bans) {
        const {userId, endsOn} = ban;
        const endDate = dateFromIsoString(endsOn);
        if (endDate.getTime() < now.getTime()) {
            console.log('Deleting ban', ban);
            db.deleteBan(userId);
            logToForum(`@${userId} is no longer banned from borrowing equipment`);
        }
    }
});
