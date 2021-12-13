const assert = require('assert');

const db = require('./dbtc-database');

const {BC_FORUM_MODE} = require('./barcode.config');

const {
    lookupUser,
    startConversation,
    startForumThread,
    postToForumThread,
    ADMIN_FORUM_ID
} = require('./xenforo');

const {renderMessage} = require('./messages.js');

//-----------------------------------------------------------------------------

function later(f) {
    setTimeout(() => {
        Promise.resolve().then(f).catch((error) => console.error(error));
    }, 500);
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
        const thread = await startForumThread(user.id, forumId, title, message);
        if (thread) {
            console.log(`Created thread ${thread.threadId}`);
            // Update the database with the new thread
            db.setMotherThread(frag.motherId, thread.threadId, thread.viewUrl);
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
        console.log(`Posted to thread ${threadId}`);
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
    });
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

async function startOopsThread(user, frag, notes) {
    // Send a PM to the user that asked for help
    const [pmTitle, pmMessage] = await renderMessage('oops-pm', {user, frag, notes});
    await startConversation([user.id], pmTitle, pmMessage, true);

    // Post in the admin forum
    const [title, message] = await renderMessage('oops-thread', {user, frag, notes});
    await startForumThread(undefined, ADMIN_FORUM_ID, title, message);
}

//-----------------------------------------------------------------------------

module.exports = {
    later,
    uberPost,
    itemAdded,
    itemImported,
    madeFragsAvailable,
    fragGiven,
    fragTransferred,
    journalUpdated,
    fragDied,
    startOopsThread
};
