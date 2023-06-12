
const assert = require('assert');

const express = require('express');
const multer = require('multer');
const _ = require('lodash');

const {db: dbtcDatabase} = require('./dbtc-database');
const {database: equipmentDatabase, database,
    getQueue, getItemForUser, insertIntoQueue, removeFromQueue, transferItem, getAllBans, getBan, addBan, deleteBan} = require('./equipment-database');
const {lookupUser} = require('./xenforo');
const {age, dateFromIsoString, nowAsIsoString, addDays} = require('./dates');

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

function displayDate(s) {
    if (!s) {
        return '';
    }
    const date = dateFromIsoString(s);
    const a = age(date, 'today', 'ago');
    return `${date.toLocaleDateString()} - ${a}`;
}

async function userSelect(userIDs) {
    const result = [];
    for (const id of userIDs) {
        const user = await lookupUser(id, true);
        if (user) {
            result.push({
                value: id,
                text: user.name
            });
        }
    }
    return result;
}

class EquipmentTool {
    select() {
        const items = database.all(
            'SELECT itemId AS value, name AS text FROM items ORDER BY name'
            , {});
        const name = 'Item';
        return {name, items};
    }

    async table(id) {
        const itemId = parseInt(id, 10);
        const rows = getQueue(itemId);
        for (const row of rows) {
            row.key = `${itemId}:${row.userId}`;
            const user = await lookupUser(row.userId, true);
            row.userName = user.name;
            row.timestamp = displayDate(row.timestamp);
            row.dateReceived = displayDate(row.dateReceived);
            row.dateDone = displayDate(row.dateDone);
        }
        const headers = [
            {text: 'User', value: 'userName'},
            {text: 'Phone #', value: 'phoneNumber'},
            {text: 'Location', value: 'location'},
            {text: 'Timestamp', value: 'timestamp'},
            {text: 'Received', value: 'dateReceived'},
            {text: 'Done', value: 'dateDone'},
        ];
        const actions = [
            {name: 'Add a user', params: {action: 'add-user', itemId}},
            {name: 'Remove a user', params: {action: 'remove-user', itemId}},
            {name: 'Transfer', params: {action: 'transfer', itemId}},
        ];
        return {
            actions,
            headers,
            items: rows,
        };
    }

    async action(params) {
        const {action} = params;
        switch (action) {
            case 'add-user':
                return {
                    title: 'Add a user to the queue',
                    params,
                    elements: [
                        {value: 'userId', text: 'User', type: 'userid'},
                        {value: 'phoneNumber', text: 'Phone number', type: 'text'},
                        {value: 'location', text: 'Location', type: 'text'},
                    ]
                };
            case 'remove-user': {
                const {itemId} = params;
                const queue = getQueue(itemId);
                const items = await userSelect(
                    queue.filter(({dateReceived}) => !dateReceived).map(({userId}) => userId));
                return {
                    title: 'Remove a user from the queue',
                    params,
                    elements: [
                        {value: 'userId', text: 'User', type: 'select', items}
                    ]
                };
            }
            case 'transfer': {
                const {itemId} = params;
                const queue = getQueue(itemId);
                const from = await userSelect(queue.filter(({dateReceived}) =>
                    dateReceived).map(({userId}) => userId));
                const to = await userSelect(queue.filter(({dateReceived}) =>
                    !dateReceived).map(({userId}) => userId));
                return {
                    title: 'Transfer the item',
                    params,
                    elements: [
                        {value: 'from', text: 'From', type: 'select', items: from},
                        {value: 'to', text: 'To', type: 'select', items: to}
                    ]
                };
            }
            default:
                break;
        }
    }

    async dialog(caller, body) {
        const {params, submit} = body;
        const {action} = params;
        switch (action) {
            case 'add-user': {
                const {itemId} = params;
                const {userId} = submit;
                if (!userId) {
                    throw 'Missing user';
                }
                const item = getItemForUser(itemId, userId.id);
                if (!item) {
                    throw 'Invalid item';
                }
                if (item.inList) {
                    throw 'Already in queue';
                }
                insertIntoQueue({
                    itemId,
                    timestamp: nowAsIsoString(),
                    userId: userId.id,
                    phoneNumber: submit.phoneNumber,
                    location: submit.location
                });
                return this.table(itemId);
            }
            case 'remove-user': {
                const {itemId} = params;
                const {userId} = submit;
                if (!userId) {
                    throw 'Missing user';
                }
                const item = getItemForUser(itemId, userId);
                if (!item) {
                    throw 'Invalid item';
                }
                if (!item.inList) {
                    throw 'Not in the queue';
                }
                if (item.hasIt) {
                    throw 'Has the item';
                }
                removeFromQueue(itemId, userId);
                return this.table(itemId);
            }
            case 'transfer': {
                const {itemId} = params;
                const {from, to} = submit;
                const item = getItemForUser(itemId, from);
                if (!item) {
                    throw 'Invalid item';
                }
                if (!item.hasIt) {
                    throw 'Does not have it';
                }
                const target = getItemForUser(itemId, to);
                if (!target) {
                    throw 'Invalid item';
                }
                if (!target.inList) {
                    throw 'Not in list';
                }
                if (target.hasIt) {
                    throw 'Already has it';
                }
                transferItem(itemId, from, to, true);
                return this.table(itemId);
            }
            default:
                break;
        }
    }
}

class BanTool {
    select() {}

    async table() {
        const items = getAllBans();
        for (const row of items) {
            row.key = row.userId;
            const user = await lookupUser(row.userId, true);
            const issuer = await lookupUser(row.issuedBy, true);
            row.userName = user.name;
            row.issuer = issuer.name;
            row.started = dateFromIsoString(row.startedOn).toLocaleDateString();
            row.ends = dateFromIsoString(row.endsOn).toLocaleDateString();
        }
        const headers = [
            {text: 'User', value: 'userName'},
            {text: 'Type', value: 'type'},
            {text: 'Reason', value: 'reason'},
            {text: 'Issued by', value: 'issuer'},
            {text: 'Started on', value: 'started'},
            {text: 'Ends on', value: 'ends'},
        ];
        const actions = [
            {name: 'Ban a user', params: {action: 'ban-user'}}
        ];
        if (items.length > 0) {
            actions.push({name: 'Remove a ban', params: {action: 'remove-user'}});
        }
        return {
            actions,
            headers,
            items,
        };
    }

    async action(params) {
        const {action} = params;
        switch (action) {
            case 'ban-user':
                return {
                    title: 'Ban a user',
                    params,
                    elements: [
                        {value: 'user', text: 'User', type: 'userid'},
                        {value: 'reason', text: 'Reason', type: 'text'},
                        {value: 'days', text: 'Days', type: 'text'},
                    ]
                };
            case 'remove-user': {
                const items = await userSelect(getAllBans().map(({userId}) => userId));
                return {
                    title: 'Remove a ban',
                    params,
                    elements: [
                        {value: 'userId', text: 'User', type: 'select', items}
                    ]
                };
            }
            default:
                break;
        }
    }

    async dialog(caller, body) {
        const {params: {action}, submit} = body;
        switch (action) {
            case 'ban-user': {
                const {user, reason, days} = submit;
                if (!user) {
                    throw 'Missing user';
                }
                if (!reason) {
                    throw 'Missing reason';
                }
                if (!days) {
                    throw 'Missing days';
                }
                const ban = getBan(user.id);
                if (ban) {
                    throw 'Already banned';
                }
                const n = parseInt(days, 10);
                if (isNaN(n) || n <= 0) {
                    throw 'Invalid days';
                }
                const now = new Date();
                addBan({
                    userId: user.id,
                    type: 'admin',
                    reason,
                    issuedBy: caller.id,
                    startedOn: now.toISOString(),
                    endsOn: addDays(now, n).toISOString()
                });
                return this.table();
            }
            case 'remove-user': {
                const {submit: {userId}} = body;
                if (!userId) {
                    throw 'Missing user';
                }
                const ban = getBan(userId);
                if (!ban) {
                    throw 'Not banned';
                }
                deleteBan(userId);
                return this.table();
            }
            default:
                break;
        }
    }
}

const TOOLS = {
    equipment: new EquipmentTool(),
    bans: new BanTool(),
};

router.get('/tools', (req, res) => {
    const tools = Object.keys(TOOLS);
    res.json({tools});
});

router.get('/tool/:name', (req, res) => {
    const {params: {name}} = req;
    const tool = TOOLS[name];
    if (!tool) {
        return res.sendStatus(404);
    }
    res.json({select: tool.select()});
});

router.get('/table/:name/:value', async (req, res) => {
    const {params: {name, value}} = req;
    const tool = TOOLS[name];
    if (!tool) {
        return res.sendStatus(404);
    }
    const table = await tool.table(value);
    res.json({table});
});

router.post('/action/:name/', express.json(), async (req, res) => {
    const {params: {name}, body} = req;
    const tool = TOOLS[name];
    if (!tool) {
        return res.sendStatus(404);
    }
    console.log(name, body);
    const dialog = await tool.action(body);
    if (!dialog) {
        return res.sendStatus(404);
    }
    res.json(dialog);
});

router.post('/dialog/:name', express.json(), async (req, res) => {
    const {user, params: {name}, body} = req;
    const tool = TOOLS[name];
    if (!tool) {
        return res.sendStatus(404);
    }
    console.log(name, body);
    try {
        const table = await tool.dialog(user, body);
        if (!table) {
            return res.sendStatus(404);
        }
        res.json({table});
    }
    catch (error) {
        if (!_.isString(error)) {
            throw error;
        }
        res.json({error});
    }
});

//-----------------------------------------------------------------------------

module.exports = router;
