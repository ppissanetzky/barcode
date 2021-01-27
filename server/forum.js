
const db = require('./dbtc-database');
const {startForumThread} = require('./xenforo');

//-----------------------------------------------------------------------------
// Load the map of 'type' to forum ID from the database
//-----------------------------------------------------------------------------

const typeMap = new Map(db.getTypes().map(({type, forumId}) => [type, forumId]));

//-----------------------------------------------------------------------------

// (async function(){
//     const threadId = await startForumThread(102, 'DBCT: some thing', 'so and so');
//     console.log(threadId);
// })();