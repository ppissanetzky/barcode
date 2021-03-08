
const {lookupUser, postToForumThread} = require('./xenforo');

//-----------------------------------------------------------------------------
// This is a thread that is used by BARcode to post about its activity
//-----------------------------------------------------------------------------

const THREAD_ID = 28403;

//-----------------------------------------------------------------------------
// We hold a list of messages and we post them all at once
//-----------------------------------------------------------------------------

let queue = [];

//-----------------------------------------------------------------------------

async function postThem() {
    const message = queue.join('\n');
    queue = [];
    try {
        await postToForumThread(THREAD_ID, message);
    }
    catch (error) {
        console.error(`Failed to post to the forum log :`, message, error);
    }
}

//-----------------------------------------------------------------------------

async function logToForum(message) {
    try {
        // Replace all @xxx with the actual user name, so the caller doesn't
        // have to look up users
        const matches = message.matchAll(/@([0-9]*)/g);
        for (const match of matches) {
            const id = match[1];
            const user = await lookupUser(id, true);
            message = message.replace(match[0], `@${user.name}`);
        }
        // Add the message to the queue
        queue.push(message);
        // If this is the first message in the queue, set a timeout to
        // flush the queue. Otherwise, there should be a timeout already
        // and it will get flushed then.
        if (queue.length === 1) {
            setTimeout(postThem, 60000);
        }
    }
    catch (error) {
        console.error(`Failed to post "${message}" to the forum log :`, error);
    }
}

//-----------------------------------------------------------------------------

module.exports = {
    logToForum
};