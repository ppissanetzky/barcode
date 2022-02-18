'use strict';

const express = require('express');
const multer = require('multer');
const _ = require('lodash');

const {age, fromUnixTime} = require('./dates');
const {entryInfo, parameterInfo, noteInfo} = require('./tank-parameters');
const {getTankJournalsForUser} = require('./xenforo');
const {INVALID_TANK, INVALID_ENTRY} = require('./errors');

//-----------------------------------------------------------------------------
// A function that returns a new connection to the database, so we can
// run each request's queries in a single connection
//-----------------------------------------------------------------------------

const connect = require('./tank-database');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------

const upload = multer();

//-----------------------------------------------------------------------------
// Creates a database connection and saves it in req.db
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    req.db = connect();
    next();
});

//-----------------------------------------------------------------------------

function augmentTank(db, tank) {
    tank.age = age(tank.dateStarted, 'today', 'ago');
    const parameters = db.getLatestParameters(tank.tankId, true);
    for (const parameter of parameters) {
        augmentParameter(parameter);
    }
    tank.parameters = parameters;
    const notes = db.getLatestParameters(tank.tankId, false);
    console.log(notes);
    for (const note of notes) {
        Object.assign(note, noteInfo(note));
    }
    tank.notes = _.sortBy(notes, ['time']).reverse();
}

function augmentParameter(parameter) {
    Object.assign(parameter, parameterInfo(parameter));
}

//-----------------------------------------------------------------------------
// Gets the list of tanks for a user
//-----------------------------------------------------------------------------

router.get('/list', (req, res) => {
    const {db, user} = req;
    const tanks = db.getTanksForUser(user.id);
    for (const tank of tanks) {
        augmentTank(db, tank);
    }
    res.json({tanks});
});

//-----------------------------------------------------------------------------
// Gets info needed to populate the add tank page
//-----------------------------------------------------------------------------

router.get('/add-info', async (req, res) => {
    const {db, user} = req;
    // Get the tank journal threads for this user from the forum
    let threads = await getTankJournalsForUser(user.id);
    if (threads.length > 0) {
        // Get the existing tanks for this user
        const tanks = db.getTanksForUser(user.id);
        // Create a set of threadIds that are already linked to
        // to those tanks
        const threadIds = new Set(tanks.map(({threadId}) => threadId));
        // Now, remove any threads that are already used
        threads = threads.filter(({threadId}) => !threadIds.has(threadId));
    }
    res.json({threads});
});

//-----------------------------------------------------------------------------
// Adding a new tank
// Should do some validation
//-----------------------------------------------------------------------------

router.post('/add', upload.none(), (req, res) => {
    const {db, user, body} = req;
    const tankId = db.addTank({
        userId: user.id,
        ...body
    });
    res.json({tankId});
});

//-----------------------------------------------------------------------------
// Get details about a tank
//-----------------------------------------------------------------------------

router.get('/:tankId', (req, res, next) => {
    const {db, user, params} = req;
    const {tankId} = params;
    const tank = db.getTankForUser(user.id, tankId);
    // This could be because the tank doesn't exist or
    // it belongs to someone else.
    // TODO: We should allow others to have a limited view of
    // someone else's tank
    if (!tank) {
        return next(INVALID_TANK());
    }
    augmentTank(db, tank);
    const entryTypes = db.getEntryTypes();
    res.json({
        entryTypes,
        tank
    });
});

//-----------------------------------------------------------------------------
// Adding a journal entry
// To be deprecated
//-----------------------------------------------------------------------------

router.post('/journal', upload.none(), (req, res, next) => {
    const {db, user, body} = req;
    const {tankId} = body;
    const tank = db.getTankForUser(user.id, tankId);
    if (!tank) {
        return next(INVALID_TANK());
    }
    db.addEntry(tankId, body);
    // This will fetch the latest parameters and notes again
    augmentTank(db, tank);
    res.json({
        tank
    });
});

//-----------------------------------------------------------------------------
// Add a new entry or update an existing one
//-----------------------------------------------------------------------------

function validateEntry(db, tank, body) {
    console.log('Validating', body);
    try {
        const {entryTypeId, rowid, value, comment, time} = body;
        let entryType;
        // Existing entry
        if (rowid) {
            // It must already exist for the correct tank
            const entry = db.getEntry(tank.tankId, rowid);
            // It must already exist
            if (!entry) {
                throw new Error('Existing entry missing');
            }
            // This includes the entry type information
            entryType = entry;
        }
        // A new entry
        else {
            // Get the entry type for it, it'll get checked below
            entryType = db.getEntryType(entryTypeId);
        }
        // Entry type is not valid
        if (!entryType) {
            throw new Error('Bad entry type');
        }
        // Check for value
        if (entryType.hasValue && !value) {
            throw new Error('Missing value');
        }
        // The value must be a good float value
        if (value) {
            const float = parseFloat(value);
            if (isNaN(float) || float < 0) {
                throw new Error('Bad value');
            }
        }
        // If the type has no value, there must be a comment
        if (!entryType.hasValue && !comment) {
            throw new Error('Missing comment');
        }
        // Check time
        if (!time) {
            throw new Error('Missing time');
        }
        const seconds = parseInt(time, 10);
        if (isNaN(seconds)) {
            throw new TypeError('Invalid time value');
        }
        const date = fromUnixTime(seconds);
        if (isNaN(date.getTime())) {
            throw new TypeError('Invalid time');
        }
        // All good
        return true;
    }
    catch (error) {
        console.error('Failed to validate:', error.message);
        return false;
    }
}

router.post('/entry', upload.none(), (req, res, next) => {
    const {db, user, body} = req;
    const {tankId} = body;
    // Make sure the tank belongs to the calling user
    const tank = db.getTankForUser(user.id, tankId);
    if (!tank) {
        return next(INVALID_TANK());
    }
    // Validate the entry
    if (!validateEntry(db, tank, body)) {
        return next(INVALID_ENTRY());
    }
    let {rowid} = body;
    // If there is a rowid, we are updating an existing entry
    if (rowid) {
        const changed = db.updateEntry(body);
        if (changed !== 1) {
            return next(INVALID_ENTRY());
        }
    }
    // Otherwise, we are adding a new entry
    else {
        // This one accepts time as an ISO string or a number. In
        // this case, time comes in as unix time but as a string,
        // so we convert it to a number
        body.time = parseInt(body.time, 10);
        rowid = db.addEntry(tank.tankId, body);
    }
    // Now, return the new or updated entry information
    // This has both the entryType and entry
    const entry = db.getEntry(tank.tankId, rowid);
    if (!entry) {
        return next(INVALID_ENTRY());
    }
    res.json({
        entry: entryInfo(entry)
    });
});

//-----------------------------------------------------------------------------
// Delete an entry
//-----------------------------------------------------------------------------

router.delete('/entry/:tankId/:rowid', (req, res, next) => {
    const {db, user, params} = req;
    const {tankId, rowid} = params;
    const tank = db.getTankForUser(user.id, tankId);
    // This could be because the tank doesn't exist or
    // it belongs to someone else.
    if (!tank) {
        return next(INVALID_TANK());
    }
    // This will only delete it if it belongs to this tank
    const changes = db.deleteEntry(tankId, rowid);
    // If this is not 1, nothing was deleted which means it was
    // an invalid rowid
    if (changes !== 1) {
        return next(INVALID_ENTRY());
    }
    res.json({});
});

//-----------------------------------------------------------------------------

router.get('/parameters/:tankId', (req, res, next) => {
    const {db, user, params} = req;
    const {tankId} = params;
    const tank = db.getTankForUser(user.id, tankId);
    // This could be because the tank doesn't exist or
    // it belongs to someone else.
    // TODO: We should allow others to have a limited view of
    // someone else's tank
    if (!tank) {
        return next(INVALID_TANK());
    }
    const entryTypes = db.getEntryTypes();
    const map = new Map();
    for (const entryType of entryTypes) {
        map.set(entryType.entryTypeId, entryType);
    }
    const entries = db.getEntries(tankId).map((entry) => {
        const entryType = map.get(entry.entryTypeId);
        return entryInfo(entryType, entry);
    });
    res.json({
        entryTypes,
        tank,
        entries
    });
});

//-----------------------------------------------------------------------------
// This gets a 'raw' entry given its rowid. It includes entryType as well
//-----------------------------------------------------------------------------

router.get('/entry/:tankId/:rowid', (req, res, next) => {
    const {db, user, params} = req;
    const {tankId, rowid} = params;
    const tank = db.getTankForUser(user.id, tankId);
    // This could be because the tank doesn't exist or
    // it belongs to someone else.
    // TODO: We should allow others to have a limited view of
    // someone else's tank
    if (!tank) {
        return next(INVALID_TANK());
    }
    const entry = db.getEntry(tankId, rowid);
    if (!entry) {
        return next(INVALID_ENTRY());
    }
    res.json({entry});
});

//-----------------------------------------------------------------------------

module.exports = router;

// const fs = require('fs');
// const sax = require('./sax.js');

// async function importApexDataLog(db, xmlStream) {
//     return new Promise((resolve, reject) => {
//         const types = new Set(['alk', 'ca', 'mg']);
//         const state = {
//             timezone: null,
//             date: null,
//             type: null,
//             last: {
//                 alk: null,
//                 ca: null,
//                 mg: null
//             }
//         };
//         const plucks = {
//             'datalog/timezone': (text) => {
//                 state.timezone = text;
//                 throw new Error('CACA');
//             },
//             'open:datalog/record': () => {
//                 state.date = null;
//                 state.type = null;
//             },
//             'datalog/record/date': (text) => {
//                 state.date = text;
//                 state.type = null;
//             },
//             'datalog/record/probe/type': (text) => {
//                 state.type = text;
//             },
//             'datalog/record/probe/value': (text) => {
//                 const {type} = state;
//                 if (types.has(type)) {
//                     const last = state.last[type];
//                     if (text !== last) {
//                         console.log('Got value', state.date, state.type, text);
//                         state.last[type] = text;
//                     }
//                 }
//             }
//         };
//         const path = [];
//         const stream = sax.createStream(true, {
//             trim: true
//         });
//         stream.on('error', (error) => {
//             console.log('GOT A STREAM ERROR');
//             reject(error);
//         });
//         stream.on('opentag', ({name}) => {
//             path.push(name);
//             const pluck = plucks[`open:${path.join('/')}`];
//             if (pluck) {
//                 pluck();
//             }
//         });
//         stream.on('text', (text) => {
//             const pluck = plucks[path.join('/')];
//             if (pluck) {
//                 pluck(text);
//             }
//         });
//         stream.on('closetag', (name) => {
//             const last = path.pop();
//             if (last !== name) {
//                 throw new Error(`${path.join('/')} : close ${name}`);
//             }
//         });
//         stream.on('end', () => resolve);

//         xmlStream.on('error', (error) => reject(error));
//         xmlStream.pipe(stream);
//     });
// }

// (async function () {
//     const stream = fs.createReadStream('/home/pablo/foo.xml');
//     try {
//         await importApexDataLog(null, stream);
//         console.log('Done');
//     }
//     catch (error) {
//         console.error('Failed with', error);
//     }
// });

