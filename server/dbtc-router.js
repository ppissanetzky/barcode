const express = require('express');
const multer = require('multer');

const {findUsersWithPrefix, lookupUser, getThreadsForItemType, switchUser} = require('./xenforo');

//-----------------------------------------------------------------------------
// Function to get runtime configuration from the environment
//-----------------------------------------------------------------------------

const BarcodeConfig = require('../barcode.config');

//-----------------------------------------------------------------------------
// The database
//-----------------------------------------------------------------------------

const db = require('./dbtc-database');

//-----------------------------------------------------------------------------
// Errors
//-----------------------------------------------------------------------------

const {
    AUTHENTICATION_FAILED,
    INVALID_FRAG,
    INVALID_INCREMENT,
    INVALID_RECIPIENT,
    INVALID_RULES,
    NOT_YOURS} = require('./errors');
const { BC_PRODUCTION } = require('../barcode.config');

//-----------------------------------------------------------------------------
// The destinaton for uploaded files (pictures)
//-----------------------------------------------------------------------------

const upload = multer({dest: BarcodeConfig.BC_UPLOADS_DIR});

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// My collection of frags
//-----------------------------------------------------------------------------

router.get('/your-collection', (req, res) => {
    const {user} = req;
    const frags = db.selectAllFragsForUser(user);
    frags.forEach((frag) => {
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
    if (frag.rules === 'private' && user.id !== frag.ownerId) {
        return next(INVALID_FRAG());
    }
    frag.owner = await lookupUser(frag.ownerId);
    frag.ownsIt = frag.ownerId === user.id;
    res.json({
        user,
        isFan: db.isFan(user.id, frag.motherId),
        frag,
        journals
    });
});

//-----------------------------------------------------------------------------
// Get journals for a frag
//-----------------------------------------------------------------------------

router.get('/journals/:fragId', (req, res, next) => {
    const {user, params} = req;
    const {fragId} = params;
    const [frag, journals] = db.selectFrag(fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // If the frag is private and the caller is not the owner,
    // we don't expose it
    if (frag.rules === 'private' && user.id !== frag.ownerId) {
        return next(INVALID_FRAG());
    }
    res.json({
        journals
    });
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
    const params = {
        ...body,
        ownerId: user.id,
        fragsAvailable: parseInt(body.fragsAvailable, 10),
        cost: parseFloat(body.cost),
        picture,
        threadId: parseInt(body.threadId, 10)
    };
    // Add the new item
    const fragId = db.insertItem(params);
    // Add a journal
    const journal = db.addJournal({
        fragId,
        timestamp: body.dateAcquired,
        entryType: 'acquired',
        picture,
        notes: body.source ?
            `Got it from ${body.source}` : 'Acquired it'
    });
    res.json({
        fragId,
        journal
    });
});

//-----------------------------------------------------------------------------
// Update a frag and, optionally, its mother
//-----------------------------------------------------------------------------

// Function to de-camelize, taken from
// https://ourcodeworld.com/articles/read/608/how-to-camelize-and-decamelize-strings-in-javascript

function decamelize(str){
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
        .filter((key) => frag[key] !== updatedFrag[key] && key != 'timestamp')
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
    if (frag.rules === 'private') {
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
    const {fragOf, ownerId, dateAcquired} = body;
    // Validate the frag. It must belong to this user and be alive. It must
    // have > 0 frags available
    const frag = db.validateFrag(user.id, fragOf, true, 0);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // If the frag is private, you cannot give a frag
    if (frag.rules === 'private') {
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
        notes: `Got it from ${user.name}`
    });

    // Add a journal entry for the one who gave it
    const journal = db.addJournal({
        fragId: fragOf,
        timestamp: dateAcquired,
        entryType: 'gave',
        picture,
        notes: `Gave a frag to ${recipient.name}`
    });
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
    // Update the cover picture for the frag
    let coverPicture;
    if (body.makeCoverPicture && picture) {
        db.updateFragPicture(user.id, fragId, picture);
        coverPicture = picture;
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
    // Reply
    res.json({journal});
});

//-----------------------------------------------------------------------------
// Returns a collection of mothers for the given rules
//-----------------------------------------------------------------------------

router.get('/collection/:rules', async (req, res, next) => {
    const {user, params} = req;
    const {rules} = params;
    if (!db.validateRules(rules)) {
        return next(INVALID_RULES());
    }
    if (rules === 'private') {
        return next(INVALID_RULES());
    }
    const mothers = db.selectCollection(user.id, rules);
    // Now, get full user information about all of the
    // owners. This could get expensive
    await Promise.all(mothers.map(async (mother) => {
        mother.owner = await lookupUser(mother.ownerId);
        mother.ownsIt = mother.ownerId === user.id;
        mother.inCollection = true;
        await Promise.all(mother.owners.map(async (owner) => {
            const fullUser = await lookupUser(owner.ownerId);
            Object.assign(owner, fullUser);
        }));
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
    const frags = db.selectFragsForMother(user.id, motherId);
    const isPrivate = frags.some(({rules}) => rules === 'private');
    if (isPrivate) {
        return next(NOT_YOURS());
    }
    // Now, get full user information about all of the
    // owners. This could get expensive
    await Promise.all(frags.map(async (frag) => {
        frag.owner = await lookupUser(frag.ownerId);
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
    if (frags.some((frag) => frag.rules === 'private' && frag.ownerId !== user.id)) {
        return next(NOT_YOURS());
    }
    const map = new Map(frags.map((frag) => [frag.fragId, frag]));
    await Promise.all(frags.map(async (frag) => {
        frag.owner = await lookupUser(frag.ownerId);
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

router.put('/fan/:motherId', (req, res) => {
    const {user, params: {motherId}} = req;
    db.addFan(user.id, motherId);
    res.json({});
});

router.delete('/fan/:motherId', (req, res) => {
    const {user, params: {motherId}} = req;
    db.removeFan(user.id, motherId);
    res.json({});
});

router.get('/fan/:motherId', (req, res) => {
    const {user, params: {motherId}} = req;
    const isFan = db.isFan(user.id, motherId);
    res.json({isFan});
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
// DBTC top 10 lists
//-----------------------------------------------------------------------------

router.get('/top10', async (req, res) => {
    const result = db.getDbtcTop10s();
    await Promise.all(Object.keys(result).map(async (key) => {
        await Promise.all(result[key].map(async (row) => {
            const {name} = await lookupUser(row.ownerId);
            row.ownerName = name;
        }));
    }));
    res.json({...result});
});

//-----------------------------------------------------------------------------
// TODO: Belongs in a '/user' API
//-----------------------------------------------------------------------------

router.get('/find-users', async (req, res) => {
    const {query} = req;
    const {prefix} = query;
    const fullUsers = await findUsersWithPrefix(prefix);
    // Make it smaller, only returning [[id, name],...]
    const users = fullUsers.map(({id, name}) => [id, name]);
    res.json({
        users
    });
});

//-----------------------------------------------------------------------------

module.exports = router;
