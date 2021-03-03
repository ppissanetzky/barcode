const assert = require('assert');
const path = require('path');

const _ = require('lodash');
const express = require('express');
const multer = require('multer');

const {resizeImage} = require('./image-resizer');

const {ageSince, age, dateFromIsoString, validIsoString} = require('./dates');

//-----------------------------------------------------------------------------
// Config
//-----------------------------------------------------------------------------

const {BC_UPLOADS_DIR, BC_MARKET_ENABLED, BC_SITE_BASE_URL} = require('./barcode.config');

//-----------------------------------------------------------------------------
// A function that returns a new connection to the database, so we can
// run each request's queries in a single connection
//-----------------------------------------------------------------------------

const connect = require('./market-database');

//-----------------------------------------------------------------------------
// Errors
//-----------------------------------------------------------------------------

const {INVALID_FRAG, NOT_YOURS} = require('./errors');
const { parseISO } = require('date-fns');

//-----------------------------------------------------------------------------
// The destinaton for uploaded files (pictures)
//-----------------------------------------------------------------------------

const upload = multer({dest: path.join(BC_UPLOADS_DIR, 'market')});

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// Must be first, guards the API when the market is not enabled
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    if (!BC_MARKET_ENABLED) {
        return res.status(404).end();
    }
    next();
});

//-----------------------------------------------------------------------------
// This is called to get information about an existing frag that the user may
// want to add to the market
//-----------------------------------------------------------------------------

router.get('/frag/:fragId', (req, res, next) => {
    const {user, params: {fragId}} = req;
    const db = connect();
    const frag = db.validateSourceFrag(user.id, fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    const seller = db.getSellerWithUserId(user.userIdSource, user.id);
    const fragListings = db.getFragListingsForMotherFrag(fragId);
    res.json({user, seller, frag, fragListings});
});

//-----------------------------------------------------------------------------
// This one adds a new frag listing, based on the given frag
//-----------------------------------------------------------------------------

router.post('/frag/:fragId', upload.none(), (req, res, next) => {
    const {user, params: {fragId}, body} = req;
    const db = connect();
    const frag = db.validateSourceFrag(user.id, fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // Validate the inputs
    const {
        title,
        description,
        cutTimestamp,
        price,
        pictures,
        location
    } = body;
    try {
        assert(title && _.isString(title), 'Invalid title');
        assert(description && _.isString(description), 'Invalid description');
        assert(cutTimestamp && _.isString(cutTimestamp), 'Invalid cut date');
        assert(validIsoString(cutTimestamp), 'Invalid cut date');
        assert(price && _.isString(price), 'Invalid price');
        assert(_.isSafeInteger(parseInt(price, 10)), 'Invalid price');
        assert(pictures && _.isString(pictures), 'Missing pictures');
        assert(pictures.split(',').length <= 3, 'Too many pictures');
        assert(pictures.split(',').length > 0, 'Missing pictures');
        assert(location && _.isString(location), 'Invalid location');
    }
    catch (error) {
        return res.json({error: error.message});
    }
    // Start a transaction
    db.transaction(() => {
        // Get the seller
        let seller = db.getSellerWithUserId(user.userIdSource, user.id);
        // If it is not there, we're going to add it now
        if (!seller) {
            seller = db.createSellerFromUser(user, location);
        }
        res.json({});
    });
});

//-----------------------------------------------------------------------------
// This is open to a DOS attack - since a valid user could upload tons of
// pictures using a script and fill up a server
//-----------------------------------------------------------------------------

router.post('/picture', upload.single('picture'), async (req, res, next) => {
    const {user, file} = req;
    if (file) {
        const picture = file.filename;
        try {
            await resizeImage(path.join('market', picture));
            return res.json({
                picture,
                src: `${BC_SITE_BASE_URL}/uploads/market/${picture}`
            });
        }
        catch (error) {
            // Do nothing, fall through and return no src
            console.error('Failed to resize', file, error);
        }
    }
    res.json({error: 'Invalid picture'});
});

//-----------------------------------------------------------------------------

module.exports = router;
