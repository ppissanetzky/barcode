
//-----------------------------------------------------------------------------
// A job to add missing thread URLs
//-----------------------------------------------------------------------------

const {lock} = require('../lock');

const {db, setMotherThread} = require('../dbtc-database');
const {getThread} = require('../xenforo');

//-----------------------------------------------------------------------------

lock('add-thread-urls', async () => {
    const mothers = db.all(
        `
        SELECT motherId, name, threadId
        FROM mothers
        WHERE rules = 'dbtc' AND threadId > 0 AND threadUrl IS NULL
        `
    );
    console.log('Found', mothers.length, 'missing thread URLs');
    for (const mother of mothers) {
        const {motherId, name, threadId} = mother;
        try {
            const thread = await getThread(threadId);
            if (thread) {
                setMotherThread(motherId, threadId, thread.viewUrl);
                console.log('Updated', motherId, threadId, thread.viewUrl);
            }
            else {
                console.error('Did not find thread', threadId, 'for mother', motherId, name);
            }
        }
        catch (error) {
            console.error('Failed to update', motherId, name, threadId, error.message);
        }
    }

});

