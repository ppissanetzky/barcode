'use strict';

const fs = require('fs');
const path = require('path');

const express = require('express');
const multer = require('multer');
const _ = require('lodash');

const {age, fromUnixTime, toUnixTime, format} = require('./dates');
const {entryInfo, parameterInfo, noteInfo, fragJournalInfo} = require('./tank-parameters');
const {getTankJournalsForUser, getThread, getThreadPosts} = require('./xenforo');
const {
    INVALID_TANK,
    INVALID_ENTRY,
    INVALID_IMPORT,
    INVALID_FRAG,
    NOT_YOURS
} = require('./errors');
const {BC_UPLOADS_DIR, BC_SITE_BASE_URL} = require('./barcode.config');
const {parseTridentDataLog} = require('./trident-datalog');
const {importTankEntries} = require('./tank-import');
const {
    selectAllFragsForUser,
    assignFrag,
    getFragJournalsForTank
} = require('./dbtc-database');

//-----------------------------------------------------------------------------
// These must match the database
//-----------------------------------------------------------------------------

const CORAL_ENTRY_TYPE = 12;
// const FISH_ENTRY_TYPE = 13;
// const INVERT_ENTRY_TYPE = 14;

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
// The destinaton for uploaded import files
//-----------------------------------------------------------------------------

const upload = multer({
    dest: path.join(BC_UPLOADS_DIR, 'imports')
});

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

router.get('/list', async (req, res) => {
    const {db, user} = req;
    const tanks = db.getTanksForUser(user.id);
    for (const tank of tanks) {
        augmentTank(db, tank);
        if (tank.threadId) {
            tank.thread = await getThread(tank.threadId);
        }
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
// Gets all entries for a tank, not just parameters
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
    // Now, get synthetic entries from frag journals
    const fragEntryType = map.get(CORAL_ENTRY_TYPE);
    const fragEntries = getFragJournalsForTank(tank.userId, tankId).map((entry) =>
        fragJournalInfo(fragEntryType, entry));

    res.json({
        entryTypes,
        tank,
        entries: _.sortBy([...entries, ...fragEntries], ['time']).reverse()
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

router.post('/import', upload.single('data'), async (req, res, next) => {
    const {db, user, body, file} = req;
    const {tankId, source} = body;
    const filePath = file?.path;
    if (!filePath) {
        return next(INVALID_IMPORT());
    }
    try {
        const tank = db.getTankForUser(user.id, tankId);
        // This could be because the tank doesn't exist or
        // it belongs to someone else.
        if (!tank) {
            return next(INVALID_TANK());
        }
        // Get the parser given the 'source'
        let parser;
        switch (source) {
            case 'trident-datalog':
                parser = parseTridentDataLog;
                break;

            default:
                console.error(`Invalid import source "${source}"`);
                break;
        }
        // This is not an import problem, it is a problem with the request
        // having an unknown source
        if (!parser) {
            return next(INVALID_IMPORT());
        }
        // Do it!
        const {imported, invalid, existing} =
            await importTankEntries(db, tank.tankId, filePath, parser);
        console.log('Import tank', tankId, source, filePath, 'imported', imported,
            'invalid', invalid, 'existing', existing);
        res.json({imported, invalid, existing});
    }
    catch (error) {
        console.log('Import failed', source, filePath, error);
        res.json({failed: true});
    }
    finally {
        if (filePath) {
            console.log('Removing', filePath);
            fs.unlink(filePath, () => {});
        }
    }
});

//-----------------------------------------------------------------------------
// Gets pictures of the tank, from the tank journal thread, frag journals and
// livestock
//-----------------------------------------------------------------------------

router.get('/pictures/:tankId', async (req, res, next) => {
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
    const pictures = [];
    if (tank.threadId) {
        let posts = await getThreadPosts(tank.userId, tank.threadId);
        posts = posts.filter(({attachments, user: {id}}) =>
            id === user.id && attachments?.length > 0);
        for (const post of posts) {
            const {postDate, viewUrl, attachments} = post;
            for (const attachment of attachments) {
                pictures.push({
                    time: toUnixTime(postDate),
                    picture: attachment,
                    url: viewUrl
                });
            }
        }
    }

    // Pictures from frag journals
    const journals = getFragJournalsForTank(tank.userId, tank.tankId);
    for (const journal of journals) {
        pictures.push({
            time: toUnixTime(journal.timestamp),
            picture: `${BC_SITE_BASE_URL}/uploads/${journal.picture}`,
            url: `/frag/${journal.fragId}`
        });
    }

    // TODO: livestock pictures

    // Sort them in descending order by time (latest first)
    pictures.sort((a, b) => b.time - a.time);

    // Now, group them by month
    const map = new Map();
    for (const picture of pictures) {
        const {time} = picture;
        const key = format(fromUnixTime(time), 'yyyyMM');
        const existing = map.get(key);
        if (existing) {
            existing.push(picture);
        }
        else {
            map.set(key, [picture]);
        }
    }
    const months = [];
    for (const [, pictures] of map) {
        // Get the time of the first picture
        // This will be the most recent for this month
        const [{time}] = pictures;
        months.push({time, pictures});
    }
    res.json({months});
});

//-----------------------------------------------------------------------------
// Gets livestock from frags and the local livestock table. Frags include those
// that belong to the tank as well as those that have not been assigned to any
// tank, so the user can assign them. It includes dead and transferred frags.
//-----------------------------------------------------------------------------

router.get('/livestock/:tankId', (req, res, next) => {
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
    // First, get all the frags for this user
    const allFrags = selectAllFragsForUser({id: tank.userId});
    // Now, split the list into those that have been assigned to this tank
    // and those that have not been assigned to any tank
    const frags = [];
    const unassignedFrags = [];
    for (const frag of allFrags) {
        if (frag.tankId === tank.tankId) {
            frags.push(frag);
        }
        else if (!frag.tankId) {
            unassignedFrags.push(frag);
        }
    }
    // TODO: now, fetch from the 'livestock' table
    const fish = [];
    res.json({tank, frags, unassignedFrags, fish});
});

//-----------------------------------------------------------------------------

router.post('/assign-frags', upload.none(), (req, res, next) => {
    const {db, user, body} = req;
    const {tankId} = body;
    const fragIds = _.isArray(body.fragId) ? body.fragId : [body.fragId];
    const tank = db.getTankForUser(user.id, tankId);
    // This could be because the tank doesn't exist or
    // it belongs to someone else.
    if (!tank) {
        return next(INVALID_TANK());
    }
    // Get all the frags for this user so we can validate
    const allFrags = selectAllFragsForUser(user);
    for (const fragIdString of fragIds) {
        const fragId = parseInt(fragIdString, 10);
        const target = allFrags.find((existing) => existing.fragId === fragId);
        if (!target) {
            return next(INVALID_FRAG());
        }
        if (target.ownerId !== user.id) {
            return next(NOT_YOURS());
        }
        if (target.tankId !== null) {
            return next(INVALID_FRAG());
        }
    }
    let assigned = 0;
    // OK, all good, we are ready to make the update
    for (const fragIdString of fragIds) {
        assigned += assignFrag(fragIdString, tankId);
    }
    res.json({assigned});
});

//-----------------------------------------------------------------------------

module.exports = router;
