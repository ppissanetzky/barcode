const express = require('express');
const multer = require('multer');

//-----------------------------------------------------------------------------
// The database
//-----------------------------------------------------------------------------

const db = require('./dbtc-database');

//-----------------------------------------------------------------------------
// The destinaton for uploaded files (pictures)
//-----------------------------------------------------------------------------

const upload = multer({dest: '/var/www/html/uploads/'});

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// My collection of frags
//-----------------------------------------------------------------------------

router.get('/your-collection', async (req, res) => {
    const {user} = req;
    const frags = await db.selectAllFragsForUser(user);
    res.json({
        user,
        frags
    });
});

//-----------------------------------------------------------------------------
// Data about one frag
//-----------------------------------------------------------------------------

router.get('/frag/:fragId', async (req, res) => {
    const {user, params} = req;
    const {fragId} = params;
    const [frag, journals] = await db.selectFrag(fragId);
    res.json({
        user,
        isOwner: user.id === frag.ownerId,
        frag,
        journals
    });
});

//-----------------------------------------------------------------------------
// When a new item is added
//-----------------------------------------------------------------------------

router.post('/add-new-item', upload.single('picture'), async (req, res) => {
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
        picture
    };
    // Add the new item
    const fragId = await db.insertItem(params);
    console.log('Added frag', fragId);
    res.json({
        fragId
    });
});

//-----------------------------------------------------------------------------

module.exports = router;