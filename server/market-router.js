const assert = require('assert');
const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const express = require('express');
const multer = require('multer');

const {resizeImage} = require('./image-resizer');

const {validIsoString} = require('./dates');

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

const {
    INVALID_FRAG,
    NOT_YOURS,
    NOT_SELLER,
    INVALID_PICTURE_SET,
    MISSING_PICTURE,
    INVALID_PICTURE_INDEX

} = require('./errors');

//-----------------------------------------------------------------------------
// The destinaton for uploaded files (pictures)
//-----------------------------------------------------------------------------

const UPLOADS_PATH = path.join(BC_UPLOADS_DIR, 'market');

const upload = multer({dest: UPLOADS_PATH});

//-----------------------------------------------------------------------------
// filename is just the filename part
//-----------------------------------------------------------------------------

function deleteUpload(filename) {
    assert(_.isString(filename) && !filename.includes(path.sep));
    const options = {recursive: false};
    const original = path.join(UPLOADS_PATH, filename);
    const small = `${original}.small`;
    console.log('Deleting', original);
    fs.rm(original, options, () =>{});
    console.log('Deleting', small);
    fs.rm(small, options, () => {});
}

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// Must be first, guards the API when the market is not enabled
// If it is, creates a database connection and saves it in req.db
// Also gets the seller
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    if (!BC_MARKET_ENABLED) {
        return res.status(404).end();
    }
    // Create a database connection for this request
    req.db = connect();
    // Get the seller (can be undefined)
    req.seller = req.db.getSellerForUser(req.user);
    // Continue
    next();
});

//-----------------------------------------------------------------------------
// Returns the seller for this user, which could be undefined
//-----------------------------------------------------------------------------

router.get('/seller', (req, res) => {
    const {user, seller} = req;
    res.json({user, seller});
});

//-----------------------------------------------------------------------------
// Updates or creates a seller
//-----------------------------------------------------------------------------

router.post('/seller', upload.none(), (req, res, next) => {
    const {db, user, seller, body} = req;
    // Form inputs. The sellerId will be undefined if it is a new seller
    const {sellerId: incomingSellerId, name, location} = body;
    try {
        assert(name && _.isString(name), 'Invalid name');
        assert(location && _.isString(location), 'Invalid location');
    }
    catch (error) {
        return res.json({error: error.message});
    }
    // If there is a seller in the request, it means this user already
    // has a seller record, so this should be an update
    if (seller) {
        const sellerId = parseInt(incomingSellerId, 10);
        if (!_.isSafeInteger(sellerId)) {
            return next(NOT_SELLER());
        }
            // The seller ID we got from the database for this user should
        // match the seller ID that was passed in the request
        if (seller.sellerId !== sellerId) {
            return next(NOT_SELLER());
        }
        db.transaction(() => {
            const updatedSeller = db.updateSeller(sellerId, name, location);
            res.json({seller: updatedSeller});
        });
        // Done
    }
    // Otherwise, there is no seller, so we will create one. This means there
    // should be no sellerId in the request
    else {
        if (incomingSellerId) {
            return next(NOT_SELLER());
        }
        db.transaction(() => {
            const newSeller = db.createSeller(user.externalUserId, name, location);
            res.json({seller: newSeller});
        });
    }
});

//-----------------------------------------------------------------------------
// This is called to get information about an existing frag that the user may
// want to add to the market. It automatically creates a seller for this user
// if one doesn't already exist and creates a picture set to upload pictures
//-----------------------------------------------------------------------------

router.get('/frag/:fragId', (req, res, next) => {
    const {db, user, params: {fragId}} = req;
    // This one can be undefined
    let {seller} = req;
    // Validate the frag
    const frag = db.validateSourceFrag(user.id, fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    db.transaction(() => {
        let pictureSetId
        // If there is a seller, create a picture set with a maximum
        // of 3 pictures
        if (seller) {
            pictureSetId = db.createPictureSet(seller.sellerId, 3);
        }
        res.json({
            user,
            seller, // Can be undefined
            frag,
            pictureSetId
        });
    });
});

//-----------------------------------------------------------------------------
// This one adds a new frag listing, based on the given frag
//-----------------------------------------------------------------------------

router.post('/frag/:fragId', upload.none(), (req, res, next) => {
    const {db, user, seller, params: {fragId}, body} = req;
    if (!seller) {
        return next(NOT_SELLER());
    }
    const frag = db.validateSourceFrag(user.id, fragId);
    if (!frag) {
        return next(INVALID_FRAG());
    }
    // Validate the inputs
    const {
        title,
        description,
        cutTimestamp,
        location
    } = body;
    let {
        pictureSetId,
        price
    } = body;
    // These are integers
    pictureSetId = parseInt(pictureSetId, 10);
    price = parseInt(price, 10);
    // Make sure the picture set exists
    if (!db.getPictureSet(seller.id, pictureSetId)) {
        return next(INVALID_PICTURE_SET());
    }
    try {
        assert(title && _.isString(title), 'Invalid title');
        assert(description && _.isString(description), 'Invalid description');
        assert(cutTimestamp && _.isString(cutTimestamp), 'Invalid cut date');
        assert(validIsoString(cutTimestamp), 'Invalid cut date');
        assert(price && _.isString(price), 'Invalid price');
        assert(_.isSafeInteger(price), 'Invalid price');
        assert(_.isSafeInteger(pictureSetId, 10), 'Invalid picture set');
        assert(location && _.isString(location), 'Invalid location');
    }
    catch (error) {
        return res.json({error: error.message});
    }
    // Start a transaction
    db.transaction(() => {
        res.json({});
    });
});

//-----------------------------------------------------------------------------
// Get the list of pictures from the database and add 'src'
//-----------------------------------------------------------------------------

function getPictures(db, pictureSetId) {
    const pictures = db.getPictures(pictureSetId);
    for (const row of pictures) {
        row.src = `${BC_SITE_BASE_URL}/uploads/market/${row.picture}`
    }
    return pictures;
}

//-----------------------------------------------------------------------------
// This is a three step process:
//  In the first step, we validate the user and the picture set.
//  If that succeeds, we save the picture.
//  Then, we resize it and add it to the picture set
//-----------------------------------------------------------------------------

function validateIncomingPictureSet(req, res, next) {
    const {db, seller, params: {pictureSetId}} = req;
    // If there is no seller, you cannot upload a picture
    if (!seller) {
        return next(NOT_SELLER());
    }
    // Make sure the pictureSetId exists and belongs to this user
    req.pictureSet = db.getPictureSet(seller.sellerId, pictureSetId);
    if (!req.pictureSet) {
        return next(INVALID_PICTURE_SET());
    }
    // Everything is fine, proceed
    next();
}

router.post('/picture/:pictureSetId',
        validateIncomingPictureSet,
        upload.single('picture'),
        async (req, res, next) => {
    const {db, seller, pictureSet: {pictureSetId, maximum}, file} = req;
    // A missing picture upload is probably abuse, since our UI
    // always sends one
    if (!file) {
        return next(MISSING_PICTURE());
    }
    // At this point, the file has been saved to disk, so any
    // error should delete it.

    // Get the list of pictures already in the database
    let pictures = getPictures(db, pictureSetId);

    // The filename part
    const picture = file.filename;
    // Try to resize it, which will fail if the image is bad
    try {
        await resizeImage(path.join('market', picture));
    }
    catch (error) {
        console.error('Failed to resize picture', error);
        // If it failed, we delete the uploaded file and respond
        // with the original list of pictures
        deleteUpload(picture);
        // Return them
        return res.json({pictures});
    }
    // We should be fine from this point, so we start a transaction
    db.transaction(() => {
        // Ok, now it has been resized, so we need to see if this one
        // would put us over the limit and delete all the ones that are over.
        // We process them in order so that the oldest one will be deleted
        // first.
        while (pictures.length >= maximum) {
            const first = pictures.shift();
            assert(first);
            const deleted = db.deletePicture(pictureSetId, first.idx);
            console.log('Deleted picture', pictureSetId, first.idx, first.picture, ':', deleted);
            deleteUpload(first.picture);
        }
        // Now, we add it to the database
        db.addPicture(pictureSetId, picture);
        // And get the new list
        pictures = getPictures(db, pictureSetId);
        // Done!
        res.json({pictures});
    });
});

//-----------------------------------------------------------------------------
// Delete a picture from a picture set
//-----------------------------------------------------------------------------

router.delete('/picture/:pictureSetId/:idx',
        validateIncomingPictureSet,
        async (req, res, next) => {
    const {db, seller, pictureSet: {pictureSetId}} = req;
    let {params: {idx}} = req;
    idx = parseInt(idx, 10);
    if (!_.isSafeInteger(idx)) {
        return next(INVALID_PICTURE_INDEX());
    }
    db.transaction(() => {
        // Get the existing pictures
        const existing = db.getPicture(pictureSetId, idx);
        if (!existing) {
            return next(INVALID_PICTURE_INDEX());
        }
        // Delete it from the database
        db.deletePicture(pictureSetId, idx);
        // Delete the files
        deleteUpload(existing.picture);
        // Respond with the new set of pictures
        const pictures = getPictures(db, pictureSetId);
        res.json({pictures});
    });
});

//-----------------------------------------------------------------------------

module.exports = router;
