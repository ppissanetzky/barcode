const assert = require('assert');

const db = require('./dbtc-database');

const {BC_FORUM_MODE} = require('./barcode.config');

const {lookupUser, startForumThread, postToForumThread} = require('./xenforo');

const {renderMessage} = require('./messages.js');

//-----------------------------------------------------------------------------

function later(f) {
    Promise.resolve().then(f).catch((error) => console.error(error));
}

//-----------------------------------------------------------------------------
// Load the map of 'type' to forum ID from the database
//-----------------------------------------------------------------------------

const typeMap = new Map(db.getTypes().map(({type, forumId}) => [type, forumId]));

//-----------------------------------------------------------------------------

function getForumForType(type) {
    let result;
    if (BC_FORUM_MODE === 'production') {
        result = typeMap.get(type);
        assert(result, `No forum for type "${type}"`);
        return result;
    }
    // This could return 0, which means posting is disabled
    return parseInt(BC_FORUM_MODE, 10);
}

//-----------------------------------------------------------------------------

function itemAdded(fragId) {
    later(async () => {
        const [frag] = db.selectFrag(fragId);
        assert(frag, `Invalid frag ${fragId}`);
        if (frag.rules !== 'dbtc') {
            console.log(`Frag ${fragId} is not DBTC, not posting`);
            return;
        }
        const user = await lookupUser(frag.ownerId);
        assert(user, `Failed to look up user ${frag.ownerId}`);
        const [title, message] = await renderMessage('new-item-thread', {user, frag});
        const forumId = getForumForType(frag.type);
        const newThreadId = await startForumThread(user.id, forumId, title, message);
        if (newThreadId) {
            console.log(`Created thread ${newThreadId}`);
            // Update the database with the new thread ID
            db.setMotherThreadId(frag.motherId, newThreadId);
        }
    });
}

//-----------------------------------------------------------------------------

function uberPost(threadId, messageName, context) {
    later(async () => {
        if (!threadId) {
            console.log(`Not posting "${messageName}" because there is no thread ID`);
            return;
        }
        const [, message] = await renderMessage(messageName, context);
        await postToForumThread(threadId, message);
        console.log(`Posted to thread ${threadId}`)
    });
}

//-----------------------------------------------------------------------------

function itemImported(user, threadId, motherId, fragId) {
    uberPost(threadId, 'item-imported', {user, motherId, fragId});
}

//-----------------------------------------------------------------------------

function madeFragsAvailable(user, frag) {
    later(async () => {
        const fans = await Promise.all(db.getFans(frag.motherId).map(async ({userId, timestamp}) => {
            const {name} = await lookupUser(userId);
            return ({name, timestamp});
        }));
        uberPost(frag.threadId, 'frags-available', {
            user,
            frag,
            fans
        });
    })
}

//-----------------------------------------------------------------------------

function fragGiven(user, recipient, fragId) {
    const [frag] = db.selectFrag(fragId);
    uberPost(frag.threadId, 'frag-given', {user, recipient, frag});
}

//-----------------------------------------------------------------------------

function fragTransferred(user, recipient, fragId) {
    const [frag] = db.selectFrag(fragId);
    uberPost(frag.threadId, 'frag-transferred', {user, recipient, frag});
}

//-----------------------------------------------------------------------------

function journalUpdated(user, frag, journal) {
    uberPost(frag.threadId, 'journal-updated', {user, frag, journal});
}

//-----------------------------------------------------------------------------

function fragDied(user, frag, journal) {
    uberPost(frag.threadId, 'frag-died', {user, frag, journal});
}

//-----------------------------------------------------------------------------

module.exports = {
    uberPost,
    itemAdded,
    itemImported,
    madeFragsAvailable,
    fragGiven,
    fragTransferred,
    journalUpdated,
    fragDied
};
