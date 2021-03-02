const assert = require('assert');

const _ = require('lodash');
const express = require('express');
const multer = require('multer');

const {resizeImage} = require('./image-resizer');

const {ageSince, age} = require('./dates');

//-----------------------------------------------------------------------------
// Config
//-----------------------------------------------------------------------------

const {BC_UPLOADS_DIR, BC_MARKET_ENABLED} = require('./barcode.config');

//-----------------------------------------------------------------------------
// The database
//-----------------------------------------------------------------------------

const db = require('./market-database');

//-----------------------------------------------------------------------------
// Errors
//-----------------------------------------------------------------------------

const {INVALID_FRAG, NOT_YOURS} = require('./errors');

//-----------------------------------------------------------------------------
// The destinaton for uploaded files (pictures)
//-----------------------------------------------------------------------------

const upload = multer({dest: BC_UPLOADS_DIR});

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
    const frag = db.validateSourceFrag(user.id, fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    const fragsForSale = db.getFragsForSale(fragId);
    res.json({user, frag, fragsForSale});
});

//-----------------------------------------------------------------------------

module.exports = router;
