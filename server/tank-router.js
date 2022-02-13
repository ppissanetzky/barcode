'use strict';

const express = require('express');
const multer = require('multer');

const {age} = require('./dates');
const {parameterInfo, JOURNAL_TYPES} = require('./tank-parameters');
const {getTankJournalsForUser} = require('./xenforo');
const {INVALID_TANK} = require('./errors');

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
    const parameters = db.getLatestParameters(tank.tankId);
    for (const parameter of parameters) {
        augmentParameter(parameter);
    }
    tank.parameters = parameters;
}

function augmentParameter(parameter) {
    const {timestamp, name, value} = parameter;
    Object.assign(parameter, parameterInfo(timestamp, name, value));
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
// Gets info about needed to populate the add tank page
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
    console.log(tank);
    res.json({
        journalTypes: JOURNAL_TYPES,
        tank
    });
});

//-----------------------------------------------------------------------------
// Adding a journal entry
//-----------------------------------------------------------------------------

router.post('/journal', upload.none(), (req, res, next) => {
    const {db, user, body} = req;
    const {tankId} = body;
    const tank = db.getTankForUser(user.id, tankId);
    if (!tank) {
        return next(INVALID_TANK());
    }
    db.addJournal(tankId, body);
    // This will fetch the latest parameters again
    augmentTank(db, tank);
    res.json({
        parameters: tank.parameters
    });
});

//-----------------------------------------------------------------------------

module.exports = router;
