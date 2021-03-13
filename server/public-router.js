
const express = require('express');

//-----------------------------------------------------------------------------
// The database
//-----------------------------------------------------------------------------

const {getShare} = require('./dbtc-database');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// THESE ARE PUBLIC ROUTES - THEY ARE NOT GUARDED BY USER VALIDATION, SO BE
// CAREFUL WHAT IS EXPOSED HERE
//-----------------------------------------------------------------------------
// We also don't want to return any custom errors since the caller is not
// our application but it is a direct link
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
// Return the data associated with a previously shared item
//-----------------------------------------------------------------------------

router.get('/shared/:shareId', (req, res) => {
    const {params: {shareId}} = req;
    const share = getShare(shareId);
    if (!share) {
        return res.status(404).end();
    }
    res.json({
        shareType: share.shareType,
        ...JSON.parse(share.json)
    });
});

//-----------------------------------------------------------------------------

module.exports = router;
