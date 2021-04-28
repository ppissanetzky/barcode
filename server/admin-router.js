
const assert = require('assert');

const express = require('express');
const multer = require('multer');
const _ = require('lodash');

const {db: dbtcDatabase} = require('./dbtc-database');
const {database: equipmentDatabase} = require('./equipment-database');

const scheduler = require('./scheduler');

const DATABASES = {
    dbtc: dbtcDatabase,
    equipment: equipmentDatabase
};

//-----------------------------------------------------------------------------
// To process multi-part posts
//-----------------------------------------------------------------------------

const upload = multer();

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------

const SCRIPTS = [
    {
        name: 'Frag details',
        param: 'Frag ID',
        readonly: true,
        statements: [
            'SELECT * FROM mothers, frags WHERE mothers.motherId = frags.motherId AND frags.fragId = $param'
        ],
        db: 'dbtc'
    },
    {
        name: 'Find mothers by name',
        param: 'Name',
        readonly: true,
        statements: [
            `
            SELECT motherId, name, rules FROM mothers WHERE name like '%' || $param || '%'
            `
        ],
        db: 'dbtc'
    },
    {
        name: 'Find mothers by owner',
        param: 'userid',
        readonly: true,
        statements: [
            'SELECT motherId, name, ownerId, rules FROM motherFrags WHERE ownerId = $param'
        ],
        db: 'dbtc'
    },
    {
        name: 'Mother details',
        param: 'Mother ID',
        readonly: true,
        statements: [
            'SELECT * FROM mothers WHERE motherId = $param',
            'SELECT COUNT(DISTINCT fragId) as fragCount FROM frags WHERE motherId = $param',
            `SELECT COUNT(DISTINCT journalId) AS journalCount FROM journals WHERE fragId IN
                (SELECT fragId FROM frags WHERE motherId = $param)`,
            'SELECT userId AS fanId FROM fans WHERE motherId = $param',
            'SELECT * FROM frags WHERE motherId = $param'
        ],
        db: 'dbtc'
    },
    {
        name: 'Delete frag',
        param: 'Frag ID',
        statements: [
            'DELETE FROM journals WHERE fragId = $param',
            'DELETE FROM frags WHERE fragId = $param'
        ],
        db: 'dbtc'
    },
    {
        name: 'Delete mother',
        param: 'Mother ID',
        statements: [
            'DELETE FROM fans WHERE motherId = $param',
            'DELETE FROM journals WHERE fragId IN (SELECT fragId FROM frags WHERE motherId = $param)',
            'DELETE FROM frags WHERE motherId = $param',
            'DELETE FROM mothers WHERE motherId = $param'
        ],
        db: 'dbtc'
    },
    {
        name: 'Move to PIF',
        param: 'Mother ID',
        statements: [
            'UPDATE mothers SET rules = \'pif\' WHERE motherId = $param'
        ],
        db: 'dbtc'
    },
    {
        name: 'List bans',
        readonly: true,
        param: '',
        statements: [
            'SELECT * FROM bans'
        ],
        db: 'equipment'

    },
    {
        name: 'Remove ban',
        param: 'userid',
        statements: [
            'DELETE FROM bans WHERE userId = $param'
        ],
        db: 'equipment'
    }
];

//-----------------------------------------------------------------------------
// Make sure the names in the SCRIPTS array are unique, or we could have
// problems
//-----------------------------------------------------------------------------

assert.strictEqual(new Set(SCRIPTS.map(({name}) => name)).size, SCRIPTS.length);

//-----------------------------------------------------------------------------
// Make sure every script has 'db' and it exists in DATABASES
//-----------------------------------------------------------------------------

assert(SCRIPTS.every(({db}) => db && DATABASES[db]));

//-----------------------------------------------------------------------------

function getScriptList() {
    return SCRIPTS.map(({name, param, readonly}) => ({name, param, readonly}));
}

//-----------------------------------------------------------------------------

function runScript(name, param) {
    const script = _.find(SCRIPTS, ['name', name]);
    if (!script) {
        throw new Error(`Invalid script "${name}"`);
    }
    const {db} = script;
    return DATABASES[db].transaction(({all, change}) => {
        const {readonly, statements} = script;
        const results = [];
        for (const statement of statements) {
            if (readonly) {
                results.push(all(statement, {param}));
            }
            else {
                const changed = change(statement, {param});
                results.push([{
                    changed,
                    statement: statement.replace('$param', param).trim()
                }]);
            }
        }
        return results;
    });
}

//-----------------------------------------------------------------------------
// THIS MUST BE THE FIRST ONE, SINCE IT PROTECTS ALL THE OTHERS
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    const {user} = req;
    if (!user.isAdmin) {
        return res.sendStatus(403);
    }
    next();
});

//-----------------------------------------------------------------------------

router.get('/scripts', (req, res) => {
    const scripts = getScriptList();
    const jobs = scheduler.getJobs();
    res.json({scripts, jobs});
});

//-----------------------------------------------------------------------------

router.post('/run', upload.none(), (req, res) => {
    const {body: {script, param}} = req;
    assert(script);
    try {
        const result = runScript(script, param);
        res.json(result);
    }
    catch (error) {
        res.json({
            error: error.toString()
        });
    }
});

//-----------------------------------------------------------------------------

router.post('/job', upload.none(), (req, res) => {
    const {body: {job}} = req;
    assert(job);
    try {
        scheduler.run(job);
        res.json({success: true});
    }
    catch (error) {
        res.json({
            error: error.toString()
        });
    }
});

//-----------------------------------------------------------------------------

module.exports = router;
