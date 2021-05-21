
const assert = require('assert');

const _ = require('lodash');
const express = require('express');
const multer = require('multer');

const {
    findUsersWithPrefix,
    lookupUser,
    getThreadsForItemType,
    getDBTCThreadsForUser,
    getThreadPosts,
    validateUserThread,
    getTankJournalsForUser
} = require('./xenforo');

const {
    itemAdded,
    itemImported,
    madeFragsAvailable,
    fragGiven,
    fragTransferred,
    journalUpdated,
    fragDied,
    uberPost,
    startOopsThread
} = require('./forum');

const {saveImageFromUrl, isGoodId} = require('./utility');

const {resizeImage} = require('./image-resizer');

const {ageSince, age} = require('./dates');

//-----------------------------------------------------------------------------
// Config
//-----------------------------------------------------------------------------

const {BC_UPLOADS_DIR, BC_SITE_BASE_URL} = require('./barcode.config');

//-----------------------------------------------------------------------------
// The database
//-----------------------------------------------------------------------------

const db = require('./dbtc-database');

//-----------------------------------------------------------------------------
// Errors
//-----------------------------------------------------------------------------

const {
    INVALID_FRAG,
    INVALID_INCREMENT,
    INVALID_RECIPIENT,
    INVALID_RULES,
    NOT_YOURS,
    INVALID_IMPORT,
    INVALID_THREAD,
    INVALID_SWAP
} = require('./errors');

//-----------------------------------------------------------------------------
// The destinaton for uploaded files (pictures)
//-----------------------------------------------------------------------------

const upload = multer({dest: BC_UPLOADS_DIR});

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = new express.Router();

//-----------------------------------------------------------------------------
// Maps a journal entryType to its icons. It's a UI concern and it could
// be in the database...
//-----------------------------------------------------------------------------

const JOURNAL_ICONS = new Map([
    ['good', 'mdi-thumb-up-outline'],
    ['bad', 'mdi-thumb-down-outline'],
    ['gave', 'mdi-hand-heart-outline'],
    ['acquired', 'mdi-emoticon-happy-outline'],
    ['fragged', 'mdi-hand-saw'],
    ['rip', 'mdi-emoticon-dead-outline'],
    ['changed', 'mdi-pencil-outline'],
    ['imported', 'mdi-import']
]);

const DEFAULT_JOURNAL_ICON = 'mdi-progress-check';

function getJournalIcon(entryType) {
    return JOURNAL_ICONS.get(entryType) || DEFAULT_JOURNAL_ICON;
}

//-----------------------------------------------------------------------------
// If a frag is private only the owner can see it
//-----------------------------------------------------------------------------

function isPrivate(frag) {
    assert(frag);
    return frag.rules === 'private';
}

function isUserAllowedToSeeFrag(user, frag) {
    assert(user);
    if (isPrivate(frag)) {
        return user.id === frag.ownerId;
    }
    return true;
}

//-----------------------------------------------------------------------------
// My collection of frags
//-----------------------------------------------------------------------------

router.get('/your-collection', (req, res) => {
    const {user} = req;
    const frags = db.selectAllFragsForUser(user);
    frags.forEach((frag) => {
        frag.owner = user;
        frag.ownsIt = true;
    });
    res.json({
        user,
        frags
    });
});

//-----------------------------------------------------------------------------
// Data about one frag
//-----------------------------------------------------------------------------

router.get('/frag/:fragId', async (req, res, next) => {
    const {user, params} = req;
    const {fragId} = params;
    const [frag, journals] = db.selectFrag(fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // If the frag is private and the caller is not the owner,
    // we don't expose it
    if (!isUserAllowedToSeeFrag(user, frag)) {
        return next(NOT_YOURS());
    }
    frag.owner = await lookupUser(frag.ownerId, true);
    frag.ownsIt = frag.ownerId === user.id;
    frag.isFan = db.isFan(user.id, frag.motherId);
    res.json({
        user,
        frag,
        journals
    });
});

//-----------------------------------------------------------------------------
// Returns the mother frag of a given fragId
//-----------------------------------------------------------------------------

router.get('/mother/:motherId', async (req, res, next) => {
    const {user, params: {motherId}} = req;
    const frag = db.getMotherFrag(motherId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // If the frag is private and the caller is not the owner,
    // we don't expose it
    if (!isUserAllowedToSeeFrag(user, frag)) {
        return next(NOT_YOURS());
    }
    frag.owner = await lookupUser(frag.ownerId, true);
    frag.ownsIt = frag.ownerId === user.id;
    frag.isFan = db.isFan(user.id, frag.motherId);
    res.json({
        user,
        frag
    });
});

//-----------------------------------------------------------------------------
// A list of frags. Expects fragIds in a JSON payload
//-----------------------------------------------------------------------------

router.post('/frags', express.json(), async (req, res, next) => {
    const {user, body: {data: {fragIds}}} = req;
    if (!_.isArray(fragIds)) {
        return next(INVALID_FRAG());
    }
    const frags = fragIds.map((fragId) => {
        const [frag] = db.selectFrag(fragId);
        if (!frag) {
            return next(INVALID_FRAG());
        }
        // If the frag is private and the caller is not the owner,
        // we don't expose it
        if (!isUserAllowedToSeeFrag(user, frag)) {
            return next(NOT_YOURS());
        }
        return frag;
    });
    for (const frag of frags) {
        frag.owner = await lookupUser(frag.ownerId, true);
        frag.ownsIt = frag.ownerId === user.id;
        frag.isFan = db.isFan(user.id, frag.motherId);
    }
    res.json({user, frags});
});

//-----------------------------------------------------------------------------
// Create a shareable link to a frag
//-----------------------------------------------------------------------------

router.get('/share/:fragId', async (req, res, next) => {
    const {user, params: {fragId}} = req;
    const [frag, journals] = db.selectFrag(fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // Only the owner can share it
    if (frag.ownerId !== user.id) {
        return next(NOT_YOURS());
    }
    frag.owner = await lookupUser(frag.ownerId, true);
    // We set it to false, so it will always be false in the
    // data we save
    frag.ownsIt = false;
    frag.isStatic = true;
    const shareId = db.shareFrag(frag, journals);
    const url = `${BC_SITE_BASE_URL}/shared/${shareId}`;
    res.json({url});
});

//-----------------------------------------------------------------------------
// Get journals for a frag
//-----------------------------------------------------------------------------

router.get('/journals/:fragId', (req, res, next) => {
    const {user, params: {fragId}} = req;
    const [frag, journals] = db.selectFrag(fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (!isUserAllowedToSeeFrag(user, frag)) {
        return next(NOT_YOURS());
    }
    res.json({journals});
});

//-----------------------------------------------------------------------------
// Returns all journals for all kids of motherId
//-----------------------------------------------------------------------------

router.get('/journals/kids/:motherId', async (req, res, next) => {
    const {user, params: {motherId}} = req;
    const {frag, journals, frags} = db.getJournalsForMother(motherId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (!isUserAllowedToSeeFrag(user, frag)) {
        return next(NOT_YOURS());
    }
    // Lookup the owner of the mother frag
    frag.owner = await lookupUser(frag.ownerId, true);
    // Now, augment journals
    const today = new Date();
    await Promise.all(journals.map(async (journal) => {
        const journalUser = await lookupUser(journal.ownerId, true);
        journal.user = {
            id: journal.ownerId,
            name: journalUser.name
        };
        journal.icon = getJournalIcon(journal.entryType);
        // This is how long ago the journal entry was made
        journal.age = ageSince(journal.timestamp, today, 'today', 'ago');
        // This is how much time elapsed since this frag was acquired
        // by the owner and the time the journal entry was made
        const since = ageSince(journal.dateAcquired, journal.timestamp);
        if (since) {
            journal.age += ` (after ${since})`;
        }
        // Don't need it since it's in 'user'
        delete journal.ownerId;
        // Removed (imported) from notes if there
        if (journal.notes) {
            journal.notes = journal.notes.replace('(imported)', '');
        }
    }));
    await Promise.all(frags.map(async (frag) => {
        frag.owner = await lookupUser(frag.ownerId, true);
    }));
    res.json({user, frag, journals, frags});
});

//-----------------------------------------------------------------------------
// When a new item is added
//-----------------------------------------------------------------------------

router.post('/add-new-item', upload.single('picture'), (req, res) => {
    // 'file' is added by multer and has all the information about the
    // uploaded file if one was present
    const {user, body, file} = req;
    const picture = file ? file.filename : null;
    // Inputs from the form
    const cost = body.cost ? parseFloat(body.cost) : 0;
    const params = {
        ...body,
        ownerId: user.id,
        fragsAvailable: parseInt(body.fragsAvailable, 10),
        cost: isNaN(cost) ? 0 : cost,
        picture,
        threadId: parseInt(body.threadId, 10)
    };
    // Add the new item
    const [, fragId] = db.insertItem(params);
    // Add a journal
    const journal = db.addJournal({
        fragId,
        timestamp: body.dateAcquired,
        entryType: 'acquired',
        picture,
        notes: body.source ?
            `Got it from ${body.source}` : 'Acquired it'
    });
    // Post to the forum out of band
    itemAdded(fragId);
    // Also resize the image out of band
    if (picture) {
        resizeImage(picture);
    }
    // Reply
    res.json({fragId, journal});
});

//-----------------------------------------------------------------------------
// Update a frag and, optionally, its mother
//-----------------------------------------------------------------------------

// Function to de-camelize, taken from
// https://ourcodeworld.com/articles/read/608/how-to-camelize-and-decamelize-strings-in-javascript

function decamelize(str) {
    return str
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1 $2')
        .toLowerCase();
}

router.post('/update/:fragId', upload.none(), (req, res, next) => {
    const {user, body, params: {fragId}} = req;
    // Make sure this frag exists, is alive and belongs to this user
    const frag = db.validateFrag(user.id, fragId, true, -1);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // See if the rules/collection are changing and reject an invalid move
    if (frag.rules !== body.rules) {
        // Only private frags can change rules
        if (!isPrivate(frag)) {
            return next(INVALID_RULES());
        }
        // If the new rules are bad, it will be caught by the foreign key
    }
    // If the frag is a mother frag, we can update the mother
    if (!frag.fragOf) {
        db.updateMother({
            ...body,
            cost: parseFloat(body.cost),
            motherId: frag.motherId
        });
    }
    // Update the frag itself
    db.updateFrag({
        ...body,
        fragId
    });
    // Get the frag's updated values so we can compare
    const updatedFrag = db.validateFrag(user.id, fragId, true, -1);
    // Build a string of the names of fields that changed, excluding
    // the timestamp
    const changed = Object.keys(frag)
        .filter((key) => frag[key] !== updatedFrag[key] && key !== 'timestamp')
        .map((key) => decamelize(key))
        .join(', ');
    // If something changed, add a journal
    if (changed) {
        // Add a journal entry
        db.addJournal({
            fragId,
            entryType: 'changed',
            notes: 'Changed ' + changed
        });
    }
    // If the rules changed to DBTC and it did not already have a thread,
    // We're going to post that it was added to DBTC (if it was)
    if (frag.rules !== updatedFrag.rules && !updatedFrag.threadId) {
        itemAdded(fragId);
    }
    res.json({});
});

//-----------------------------------------------------------------------------
// Changing the number of available frags
//-----------------------------------------------------------------------------

router.put('/frag/:fragId/available/:fragsAvailable', (req, res, next) => {
    const {user, params} = req;
    const {fragId, fragsAvailable} = params;
    // Validate the frag. It must belong to this user and be alive. We don't
    // care how many frags are already available, so we send -1 for that
    const frag = db.validateFrag(user.id, fragId, true, -1);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // If the frag is private, you cannot make frags available
    if (isPrivate(frag)) {
        return next(INVALID_FRAG());
    }
    // Validate fragsAvailable
    const value = parseInt(fragsAvailable, 10);
    if (isNaN(value) || value < 0) {
        return next(INVALID_INCREMENT());
    }
    // Now update it, which returns the new value
    const result = db.updateFragsAvailable(user.id, fragId, value);
    // Add a journal
    const journal = db.addJournal({
        fragId,
        timestamp: null,
        entryType: 'fragged',
        picture: null,
        notes: `Updated available frags to ${value}`
    });
    // Post to the forum
    if (result) {
        madeFragsAvailable(user, {
            ...frag,
            fragsAvailable: result
        });
    }
    // Reply
    res.json({
        fragsAvailable: result,
        journal
    });
});

//-----------------------------------------------------------------------------
// Giving a frag
//-----------------------------------------------------------------------------

router.post('/give-a-frag', upload.single('picture'), async (req, res, next) => {
    // 'file' is added by multer and has all the information about the
    // uploaded file if one was present
    const {user, body, file} = req;
    const picture = file ? file.filename : null;
    // Validate
    const {fragOf, ownerId, dateAcquired, transfer} = body;
    // Validate the frag. It must belong to this user and be alive.
    const frag = db.validateFrag(user.id, fragOf, true, -1);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // If the frag is private, you cannot give a frag
    if (isPrivate(frag)) {
        return next(INVALID_FRAG());
    }
    // Now make sure the new owner is allowed
    const recipient = await lookupUser(ownerId);
    if (!(recipient && recipient.allowed)) {
        return next(INVALID_RECIPIENT());
    }
    // You can't give a frag to yourself
    if (recipient.id === user.id) {
        return next(INVALID_RECIPIENT());
    }
    // Inputs from the form
    const params = {
        ...body,
        picture
    };
    // Do it
    const [fragsAvailable, newFragId] = db.giveAFrag(user.id, params);
    // Add a journal entry for the recipient
    db.addJournal({
        fragId: newFragId,
        timestamp: dateAcquired,
        entryType: 'acquired',
        notes: transfer ?
            `Transferred from ${user.name}` :
            `Got it from ${user.name}`
    });

    // Add a journal entry for the one who gave it
    const journal = db.addJournal({
        fragId: fragOf,
        timestamp: dateAcquired,
        entryType: 'gave',
        picture,
        notes: transfer ?
            `Transferred to ${recipient.name}` :
            `Gave a frag to ${recipient.name}`
    });
    // Remove the recipient from the fans table
    db.removeFan(recipient.id, frag.motherId);
    // Post to the forum
    if (transfer) {
        fragTransferred(user, recipient, newFragId);
    }
    else {
        fragGiven(user, recipient, newFragId);
    }
    if (picture) {
        resizeImage(picture);
    }
    // Reply
    res.json({
        fragsAvailable,
        journal
    });
});

//-----------------------------------------------------------------------------
// Add a journal entry
//-----------------------------------------------------------------------------

router.post('/frag/:fragId/journal', upload.single('picture'), (req, res, next) => {
    // 'file' is added by multer and has all the information about the
    // uploaded file if one was present
    const {user, body, params, file} = req;
    const picture = file ? file.filename : null;
    // Validate
    const {fragId} = params;
    // Validate the frag. It must belong to this user and be alive. It must
    // have > -1 frags available
    const frag = db.validateFrag(user.id, fragId, true, -1);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // Do it
    const journal = db.addJournal({
        fragId,
        timestamp: null,
        entryType: body.entryType || null,
        picture,
        notes: body.notes || null
    });
    // Update the cover picture for the frag if the user said so, or
    // the frag doesn't have a cover picture.
    let coverPicture;
    if (picture && (body.makeCoverPicture || !frag.picture)) {
        db.updateFragPicture(user.id, fragId, picture);
        coverPicture = picture;
    }
    // Post to the forum
    journalUpdated(user, frag, journal);
    // Resize the picture if any
    if (picture) {
        resizeImage(picture);
    }
    // Reply
    res.json({
        journal,
        coverPicture
    });
});

//-----------------------------------------------------------------------------
// Mark a frag as dead
//-----------------------------------------------------------------------------

router.post('/frag/:fragId/rip', upload.none(), (req, res, next) => {
    // 'file' is added by multer and has all the information about the
    // uploaded file if one was present
    const {user, body, params} = req;
    // Validate
    const {fragId} = params;
    // Validate the frag. It must belong to this user and be alive. It must
    // have > -1 frags available
    const frag = db.validateFrag(user.id, fragId, true, -1);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // Do it
    db.markAsDead(user.id, fragId);
    // Add a journal
    const journal = db.addJournal({
        fragId,
        timestamp: null,
        entryType: 'rip',
        picture: null,
        notes: body.notes || 'RIP'
    });
    // Post to the thread
    fragDied(user, frag, journal);
    // Reply
    res.json({journal});
});

//-----------------------------------------------------------------------------
// Returns a collection of mothers for the given rules
//-----------------------------------------------------------------------------

router.get('/collection/:rules/p/:page', async (req, res, next) => {
    const {user, params: {rules, page}, query} = req;
    if (!db.validateRules(rules)) {
        return next(INVALID_RULES());
    }
    if (rules === 'private') {
        return next(INVALID_RULES());
    }
    const mothers = db.selectCollectionPaged(user.id, rules, page, query);
    await Promise.all(mothers.map(async (mother) => {
        mother.owner = await lookupUser(mother.ownerId, true);
        mother.inCollection = true;
    }));
    res.json({
        user,
        mothers
    });
});

//-----------------------------------------------------------------------------
// Returns all frags for a given mother
//-----------------------------------------------------------------------------

router.get('/kids/:motherId', async (req, res, next) => {
    const {user, params: {motherId}} = req;
    const frags = db.selectFragsForMother(motherId);
    if (frags.some((frag) => isPrivate(frag))) {
        return next(NOT_YOURS());
    }
    // Now, get full user information about all of the
    // owners. This could get expensive
    await Promise.all(frags.map(async (frag) => {
        frag.owner = await lookupUser(frag.ownerId, true);
        frag.ownsIt = frag.ownerId === user.id;
    }));
    res.json({
        user,
        frags
    });
});

//-----------------------------------------------------------------------------
// Get a lineage tree for a mother
//-----------------------------------------------------------------------------

router.get('/tree/:motherId', async (req, res, next) => {
    const {user, params: {motherId}} = req;
    const frags = db.selectFragsForMother(motherId);
    if (frags.length === 0) {
        return next(INVALID_FRAG());
    }
    if (frags.some((frag) => !isUserAllowedToSeeFrag(user, frag))) {
        return next(NOT_YOURS());
    }
    const map = new Map(frags.map((frag) => [frag.fragId, frag]));
    await Promise.all(frags.map(async (frag) => {
        frag.owner = await lookupUser(frag.ownerId, true);
    }));
    const [root] = frags.filter((frag) => {
        if (frag.fragOf) {
            const parent = map.get(frag.fragOf);
            if (parent.children) {
                parent.children.push(frag);
            }
            else {
                parent.children = [frag];
            }
            return false;
        }
        return true;
    });
    if (!root.children) {
        root.children = [];
    }
    res.json({root});
});

//-----------------------------------------------------------------------------
// Become a fan or stop being a fan
//-----------------------------------------------------------------------------

async function getLikes(userId, motherId) {
    const result = db.getLikes(userId, motherId);
    const users = [];
    for (const user of result.users) {
        users.push(await lookupUser(user, true));
    }
    result.users = users;
    return result;
}

router.put('/fan/:motherId', async (req, res, next) => {
    const {user, params: {motherId}} = req;
    const frag = db.getMotherFrag(motherId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (!isUserAllowedToSeeFrag(user, frag)) {
        return next(NOT_YOURS());
    }
    if (frag.ownerId !== user.id) {
        db.addFan(user.id, motherId);
    }
    const result = await getLikes(user.id, motherId);
    uberPost(frag.threadId, 'got-in-line', {user, frag, fans: result.users});
    res.json(result);
});

router.delete('/fan/:motherId', async (req, res, next) => {
    const {user, params: {motherId}} = req;
    const frag = db.getMotherFrag(motherId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (!isUserAllowedToSeeFrag(user, frag)) {
        return next(NOT_YOURS());
    }
    db.removeFan(user.id, motherId);
    const result = await getLikes(user.id, motherId);
    res.json(result);
});

router.get('/fan/:motherId', async (req, res, next) => {
    const {user, params: {motherId}} = req;
    const frag = db.getMotherFrag(motherId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (!isUserAllowedToSeeFrag(user, frag)) {
        return next(NOT_YOURS());
    }
    const result = await getLikes(user.id, motherId);
    res.json(result);
});

//-----------------------------------------------------------------------------
// Get enums (types and rules for now)
//-----------------------------------------------------------------------------

router.get('/enums', (req, res) => {
    res.json(db.getEnums());
});

//-----------------------------------------------------------------------------
// Get threads for a specific type
//-----------------------------------------------------------------------------

router.get('/threads-for-type', async (req, res) => {
    const {user, query} = req;
    const {type} = query;
    const threads = await getThreadsForItemType(user.id, type);
    res.json({
        threads
    });
});

//-----------------------------------------------------------------------------
// Get a list of DBTC threads started by another user as well as a list of
// thread IDs the user has imported and a list of threads that have not been
// imported.
//-----------------------------------------------------------------------------

router.get('/threads/:userId', async (req, res) => {
    const {params: {userId}} = req;
    const id = parseInt(userId, 10);
    const threads = await getDBTCThreadsForUser(id);
    const importedThreadIds = db.getUserThreadIds(id);
    const threadsNotImported = threads.filter(({threadId}) =>
        !importedThreadIds.includes(threadId));
    res.json({threads, threadsNotImported, importedThreadIds});
});

//-----------------------------------------------------------------------------
// Returns a list of alive, DBTC frags owned by this user
//-----------------------------------------------------------------------------

router.get('/frags/:userId', (req, res) => {
    const {params: {userId}} = req;
    const id = parseInt(userId, 10);
    const frags = db.getAllDBTCFragsForUser(id);
    res.json({frags});
});

//-----------------------------------------------------------------------------
// The caller is telling us that they got a frag of the given item from
// the given user. The frag must be a DBTC frag. If it has a thread, we will
// post to that thread prompting the given user to give the digital frag
//-----------------------------------------------------------------------------

router.put('/received/:fragId/from/:userId', async (req, res, next) => {
    const {user, params: {fragId, userId}} = req;
    const frag = db.validateFrag(userId, fragId, true, -1);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (frag.rules !== 'dbtc') {
        return next(INVALID_FRAG());
    }
    if (isPrivate(frag)) {
        return next(NOT_YOURS());
    }
    if (!frag.threadId) {
        return next(INVALID_THREAD());
    }
    const giver = await lookupUser(userId, true);
    if (!giver) {
        return next(INVALID_RECIPIENT());
    }
    uberPost(frag.threadId, 'update-frag-received', {user, frag, giver});
    res.status(200).end();
});

//-----------------------------------------------------------------------------
// Gets a page of DBTC threads for the current user excluding those that have
// already been imported
//-----------------------------------------------------------------------------

router.get('/imports', async (req, res) => {
    const {user} = req;
    // This is a set of all threads that this user has created or imported
    const imported = new Set(db.getUserThreadIds(user.id));
    // These are the threads loaded from the forum
    const allThreads = await getDBTCThreadsForUser(user.id);
    // Remove those that are already here
    const threads = allThreads.filter(({threadId}) => !imported.has(threadId));
    res.json({user, threads});
});

router.get('/imports/:threadId', async (req, res, next) => {
    const {user, params: {threadId}} = req;
    const posts = await getThreadPosts(user.id, threadId);
    if (!posts) {
        return next(NOT_YOURS());
    }
    res.json({posts});
});

router.post('/import', upload.single('picture'), async (req, res, next) => {
    const {user, body, file} = req;
    let picture = file ? file.filename : null;
    const {
        threadId,
        name,
        type,
        dateAcquired,
        pictureUrl,
        transactions: jsonTransactions
    } = body;
    // Validate that the threadId belongs to this user to prevent
    // direct API attacks
    const thread = await validateUserThread(user.id, threadId);
    if (!thread) {
        return next(NOT_YOURS());
    }
    // Parse the transactions
    const transactions = JSON.parse(jsonTransactions);
    // Validate the transactions now, before we insert the mother frag
    const good = transactions.every(({date, from, fromId, type, to, toId}) => {
        try {
            assert(date, 'Missing date');
            assert(from && isGoodId(fromId), 'Missing from information');
            switch (type) {
                case 'gave':
                case 'trans':
                    assert(to && isGoodId(toId), 'Missing to information');
                    break;
                case 'rip':
                    break;
                default:
                    assert(false, 'Invalid type');
            }
            return true;
        }
        catch (error) {
            console.error('Import transaction invalid :', error, {
                threadId, date, from, fromId, type, to, toId
            });
            console.error(JSON.stringify(body, null, 2));
            return false;
        }
    });
    if (!good) {
        return next(INVALID_IMPORT());
    }
    // Now, see if there is a picture URL and download it,
    if (!picture && pictureUrl) {
        try {
            picture = await saveImageFromUrl(upload, pictureUrl);
        }
        catch (error) {
            console.error('Failed to download image', pictureUrl, error);
        }
    }
    // Insert the main frag
    const [motherId, fragId] = db.insertItem({
        name,
        type,
        flow: 'Medium',
        light: 'Medium',
        hardiness: 'Normal',
        growthRate: 'Normal',
        cost: 0,
        rules: 'dbtc',
        threadId,
        threadUrl: thread.viewUrl,
        ownerId: user.id,
        dateAcquired,
        picture,
        fragOf: null,
        fragsAvailable: 0
    });
    // Add a journal entry when it was acquired
    db.addJournal({
        fragId,
        timestamp: dateAcquired,
        entryType: 'acquired',
        notes: 'Acquired it (imported)'
    });
    // Add another journal entry about it being imported
    db.addJournal({
        fragId,
        entryType: 'imported',
        notes: 'Imported from the forum'
    });
    // This is a map from user ID to frag ID so that we know who
    // has what as we process each transaction. It starts out with
    // the first frag we just inserted for the current user.
    const fragMap = new Map([[user.id, fragId]]);
    transactions.forEach(({date, from, fromId, type, to, toId}) => {
        function problem(message) {
            console.error('Import transaction failed :', message, {
                threadId, date, from, fromId, type, to, toId
            });
        }
        switch (type) {
            case 'gave': {
                // Get the source frag ID and bail if it cannot be found
                const fromFragId = fragMap.get(fromId);
                if (!fromFragId) {
                    return problem('Could not find the source frag');
                }
                const [, toFragId] = db.giveAFrag(fromId, {
                    motherId,
                    ownerId: toId,
                    dateAcquired: date,
                    fragOf: fromFragId,
                    fragsAvailable: 0
                });
                // Add thew new frag to our map
                fragMap.set(toId, toFragId);
                // Add a journal for the recipient
                db.addJournal({
                    fragId: toFragId,
                    timestamp: date,
                    entryType: 'acquired',
                    notes: `Got it from ${from} (imported)`
                });
                // Now, add a journal for the giver
                db.addJournal({
                    fragId: fromFragId,
                    timestamp: date,
                    entryType: 'gave',
                    notes: `Gave a frag to ${to} (imported)`
                });
            }
                break;

            case 'trans': {
                // Get the source frag ID and bail if it cannot be found
                const fromFragId = fragMap.get(fromId);
                if (!fromFragId) {
                    return problem('Could not find the source frag');
                }
                const [, toFragId] = db.giveAFrag(fromId, {
                    motherId,
                    ownerId: toId,
                    dateAcquired: date,
                    fragOf: fromFragId,
                    fragsAvailable: 0
                });
                // Add thew new frag to our map
                fragMap.set(toId, toFragId);
                // Remove the original frag from the map, since this is
                // a transfer
                fragMap.delete(fromId);
                // Add a journal for the recipient
                db.addJournal({
                    fragId: toFragId,
                    timestamp: date,
                    entryType: 'acquired',
                    notes: `Transferred from ${from} (imported)`
                });
                // Now, add a journal for the giver
                db.addJournal({
                    fragId: fromFragId,
                    timestamp: date,
                    entryType: 'gave',
                    notes: `Transferred to ${to} (imported)`
                });
                // Mark the original frag as dead with a transferred status
                db.markAsDead(fromId, fromFragId, 'transferred');
            }
                break;
            case 'rip': {
                // Get the source frag ID and bail if it cannot be found
                const fromFragId = fragMap.get(fromId);
                if (!fromFragId) {
                    return problem('Could not find the source frag');
                }
                // Remove it from the map
                fragMap.delete(fromId);
                // Mark it as dead
                db.markAsDead(fromId, fromFragId);
                // Add a journal
                db.addJournal({
                    fragId: fromFragId,
                    timestamp: date,
                    entryType: 'rip',
                    notes: 'RIP (imported)'
                });
            }
                break;

            default:
                return problem(`Invalid transaction type "${type}"`);
        }
    });
    // Add a post to the thread out of band
    itemImported(user, threadId, motherId, fragId);
    // Resize the picture
    if (picture) {
        resizeImage(picture);
    }
    // Send back the response now
    res.json({motherId, fragId});
});

//-----------------------------------------------------------------------------
// DBTC top 10 lists
//-----------------------------------------------------------------------------

router.get('/top10', async (req, res) => {
    const result = db.getDbtcTop10s();
    await Promise.all(Object.keys(result).map(async (key) => {
        await Promise.all(result[key].map(async (row) => {
            if (row.ownerId) {
                const user = await lookupUser(row.ownerId, true);
                row.ownerName = user ? user.name : '<unknown>';
            }
        }));
    }));
    res.json({...result});
});

//-----------------------------------------------------------------------------

router.get('/member/:userId', async (req, res) => {
    const {user, params: {userId}} = req;
    const member = await lookupUser(userId, true);
    const isMe = member.id === user.id;
    member.name = member.name.replace(' (NSM)', '');
    const registerAge = age(member.registerDate, null, 'ago');
    const tankJournals = await getTankJournalsForUser(member.id);
    const availableFrags = db.selectAllFragsForUser(member)
        .filter(({fragsAvailable}) => fragsAvailable)
        .map(({fragId, name, fragsAvailable, type, rules}) => ({
            fragId,
            name,
            type,
            collection: rules.toUpperCase(),
            count: fragsAvailable
        }))
        .sort((a, b) => b.count - a.count);
    const stats = db.getUserStats(member.id);
    const waitingFor = db.getWaitingFragsForUser(member.id);
    const linksCompleted = db.getDbtcLinksCompletedForUser(member.id);
    res.json({
        ...member,
        isMe,
        registerAge,
        tankJournals,
        availableFrags,
        stats,
        waitingFor,
        linksCompleted
    });
});

//-----------------------------------------------------------------------------
// When a user reports that something is wrong with a frag. We post a message
// the the log/activity thread about it in hopes that an admin will pick it
// up and handle it.
//-----------------------------------------------------------------------------

router.post('/oops/:fragId', upload.none(), (req, res, next) => {
    const {user, params: {fragId}, body: {notes}} = req;
    const [frag] = db.selectFrag(fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (frag.ownerId !== user.id) {
        return next(NOT_YOURS());
    }
    startOopsThread(user, frag, notes);
    res.sendStatus(200);
});

//-----------------------------------------------------------------------------

router.get('/swaps', async (req, res) => {
    const swaps = db.getSwaps();
    for (const swap of swaps) {
        swap.participants = [];
        const participants = db.getSwapParticipants(swap.swapId);
        for (const participant of participants) {
            const user = await lookupUser(participant.traderId);
            swap.participants.push({
                name: user.name,
                user,
                items: participant.items
            });
        }
        swap.participants = _.sortBy(swap.participants, 'name');
    }
    res.json({swaps});
});

router.get('/swap/:swapId', (req, res, next) => {
    const {params: {swapId}} = req;
    const swap = db.getSwap(swapId);
    if (!swap) {
        return next(INVALID_SWAP());
    }
    res.json({swap});
});

router.get('/swap/:swapId/frags', (req, res, next) => {
    const {params: {swapId}} = req;
    const swap = db.getSwap(swapId);
    if (!swap) {
        return next(INVALID_SWAP());
    }
    const frags = db.getSwapFrags(swapId);
    res.json({swap, frags});
});

router.post('/swap/add', upload.none(), async (req, res, next) => {
    const {user, body:{swapId, sourceFragId, traderId, category}} = req;
    const swap = db.getSwap(swapId);
    if (!swap) {
        return next(INVALID_SWAP());
    }
    if (!swap.isOpen) {
        return next(INVALID_SWAP());
    }
    const frag = db.validateFrag(user.id, sourceFragId, true, -1);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    if (traderId) {
        const trader = await lookupUser(traderId);
        if (!trader) {
            return next(INVALID_RECIPIENT());
        }
    }
    db.addSwapFrag(swapId, frag.fragId, traderId || user.id, category || 'standard');
    res.json({});
});

//-----------------------------------------------------------------------------
// TODO: Belongs in a '/user' API
//-----------------------------------------------------------------------------

router.get('/find-users', async (req, res) => {
    const {query} = req;
    const {prefix} = query;
    const all = query.all === 'true';
    const fullUsers = await findUsersWithPrefix(prefix, all);
    // Make it smaller, only returning [[id, name],...]
    const users = fullUsers.map(({id, name}) => [id, name]);
    res.json({
        users
    });
});

//-----------------------------------------------------------------------------

module.exports = router;
