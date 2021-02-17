
const _ = require('lodash');

const {differenceInMonths} = require('date-fns');

const {lock} = require('../lock');
const db = require('../dbtc-database');
const {dateFromIsoString} = require('../dates');
const {lookupUser} = require('../xenforo');
const {uberPost} = require('../forum');

//-----------------------------------------------------------------------------

const USER_JOURNAL_TYPES = new Set(['update', 'good', 'bad']);

// These are the types of nags we're doing now. The string is also
// the name of the message in the 'messages/' directory.

const NAG_JOURNAL = 'dbtc-journal-nag';
const NAG_PICTURE = 'dbtc-picture-nag';

//-----------------------------------------------------------------------------

async function getNag(type) {
    // Get a list of unique user IDs and shuffle them
    const userIds = _.shuffle(db.getUserIds());
    // Iterate over them until we find a suitable one
    for (const userId of userIds) {
        // Lookup the user to see if they are supporting member
        const user = await lookupUser(userId);
        if (!user) {
            continue;
        }
        // Get all the frags for this user and shuffle them
        const frags = _.shuffle(db.selectAllFragsForUser(user));
        // Iterate over all that user's frags
        for (const frag of frags) {
            // It must have a valid forum thread, be alive and be in DBTC
            if (!(frag.threadId && frag.isAlive && frag.rules === 'dbtc')) {
                continue;
            }
            switch (type) {
                case NAG_PICTURE: {
                    if (!frag.picture) {
                        return [user, frag];
                    }
                }
                break;

                case NAG_JOURNAL: {
                    const {fragId} = frag;
                    // Now, get journals for that one and keep only those that are
                    // created by users (as opposed to automatic ones)
                    const journals = db.getFragJournals(fragId)
                        .filter(({entryType}) => USER_JOURNAL_TYPES.has(entryType));
                    // The oldest journal should be first
                    const [oldest] = journals;
                    // Now pick a timestamp to use to determine age. If there are no
                    // user-submitted journals, 'oldest' will be undefined so we use
                    // the dateAcquired of the frag.
                    const timestamp = oldest ? oldest.timestamp : frag.dateAcquired;
                    // Figure out how many months it has been
                    const months = differenceInMonths(new Date(), dateFromIsoString(timestamp));
                    console.log('', fragId, months, 'months old');
                    // If it has been more than six months, this is the one we will nag
                    if (months > 6) {
                        return [user, frag];
                    }
                }
                break;
            }
        }
    }
}

//-----------------------------------------------------------------------------

lock('dbtc-nag', async () => {
    // Choose a type of nag randomly
    const type = Math.random() < 0.5 ? NAG_JOURNAL : NAG_PICTURE;
    // Now, get the user and frag for that type of nag
    const [user, frag] = await getNag(type);
    // Nag!
    if (user && frag) {
        await uberPost(frag.threadId, type, {user, frag});
    }
});