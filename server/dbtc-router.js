const express = require('express');
const multer = require('multer');

const {findUsersWithPrefix, lookupUser, getThreadsForItemType} = require('./xenforo');

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

const {INVALID_FRAG, INVALID_INCREMENT, INVALID_RECIPIENT} = require('./errors');

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
    res.json({
        success: true,
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
    frag.owner = await lookupUser(frag.ownerId);
    res.json({
        success: true,
        user,
        isOwner: user.id === frag.ownerId,
        frag,
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
// Returns the DBTC mothers
//-----------------------------------------------------------------------------

router.get('/mothers', async (req, res) => {
    const {user} = req;
    const mothers = db.selectCollection(user.id);
    // Now, get full user information about all of the
    // owners. This could get expensive
    await Promise.all(mothers.map(async (mother) => {
        // We're also going to split the list of owners
        // into two lists: one for those that have frags
        // and another for those that don't. We remove
        // the original owners.
        const owners = mother.owners;
        delete mother.owners;
        mother.haves = [];
        mother.haveNots = [];
        mother.fragsAvailable = 0;
        await Promise.all(owners.map(async (owner) => {
            const fullUser = await lookupUser(owner.ownerId);
            Object.assign(owner, fullUser);
            if (owner.fragsAvailable) {
                mother.haves.push(owner);
                mother.fragsAvailable += owner.fragsAvailable;
            }
            else {
                mother.haveNots.push(owner);
            }
        }))
    }));
    res.json({
        user,
        mothers
    });
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
