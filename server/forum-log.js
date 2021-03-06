
const debug = require('debug')('barcode:forum-log');
const ms = require('ms');

const {lookupUser, postToForumThread} = require('./xenforo');

//-----------------------------------------------------------------------------
// This is a thread that is used by BARcode to post about its activity
//-----------------------------------------------------------------------------

const LOG_THREAD_ID = 28403;

//-----------------------------------------------------------------------------
// How long to hold messages before we post them. This lets us batch them up
// and post once rather than a bunch of times
//-----------------------------------------------------------------------------

const HOLD_TIME = '1 minute';

//-----------------------------------------------------------------------------
// We hold a list of messages and we post them all at once
//-----------------------------------------------------------------------------

let queue = [];

//-----------------------------------------------------------------------------

async function postThem() {
    const count = queue.length;
    if (count === 0) {
        debug('Nothing to post');
        return;
    }
    debug('Posting', count, 'messages');
    const message = queue.join('\n');
    queue = [];
    try {
        await postToForumThread(LOG_THREAD_ID, message);
    }
    catch (error) {
        console.error('Failed to post to the forum log :', message, error);
    }
}

//-----------------------------------------------------------------------------

async function logToForum(message) {
    try {
        // Replace all @xxx with the actual user name, so the caller doesn't
        // have to look up users
        const matches = message.matchAll(/@(\d+)/g);
        for (const match of matches) {
            const id = match[1];
            const user = await lookupUser(id, true);
            if (user) {
                message = message.replace(match[0], `@${user.name}`);
            }
        }
        // Add the message to the queue
        queue.push(message);
        debug(`Queuing message "${message}"`);
        // If this is the first message in the queue, set a timeout to
        // flush the queue. Otherwise, there should be a timeout already
        // and it will get flushed then.
        if (queue.length === 1) {
            debug('Posting in', HOLD_TIME);
            setTimeout(postThem, ms(HOLD_TIME));
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
