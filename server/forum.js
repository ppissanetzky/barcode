const assert = require('assert');

const db = require('./dbtc-database');

const {BC_FORUM_MODE} = require('../barcode.config');

const {lookupUser, startForumThread} = require('./xenforo');

const {renderMessage} = require('./messages.js');

//-----------------------------------------------------------------------------
// Load the map of 'type' to forum ID from the database
//-----------------------------------------------------------------------------

const typeMap = new Map(db.getTypes().map(({type, forumId}) => [type, forumId]));

//-----------------------------------------------------------------------------

const POSTING_ENABLED =
    BC_FORUM_MODE === "production" ||
    parseInt(BC_FORUM_MODE, 10) > 0;

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

async function itemAdded(fragId) {
    const [frag] = db.selectFrag(fragId);
    assert(frag, `Invalid frag ${fragId}`);
    if (frag.rules !== 'dbtc') {
        console.log(`Frag ${fragId} is not DBTC, not posting`);
        return;
    }
    const user = await lookupUser(frag.ownerId);
    assert(user, `Failed to look up user ${frag.ownerId}`);
    const {threadId} = frag;
    // Thread ID zero means that we have to create a new thread
    if (threadId === 0) {
        const [title, message] = await renderMessage('new-item-thread', {user, frag});
        const forumId = getForumForType(frag.type);
        console.log(`Posting new thread to ${forumId}`);
        console.log(`"${title}"`);
        console.log(`"${message}"`);
        if (POSTING_ENABLED) {
            const newThreadId = await startForumThread(forumId, title, message);
            console.log(`Created thread ${newThreadId}`);
            // Update the database with the new thread ID
            db.setMotherThreadId(frag.motherId, newThreadId);
        }
        return;
    }
    // Falsy thread ID means that no posting should be done
    if (!threadId) {
        console.log(`Frag ${fragId} is marked with no thread ID, not posting`);
        return;
    }
    // Otherwise, it already has a thread
    console.log('Already has a thread, doing nothing');
}

//-----------------------------------------------------------------------------

//  (async function(){
//      itemAdded(1);
//  })();