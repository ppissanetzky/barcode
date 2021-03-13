'use strict';

const express = require('express');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// THIS MUST BE FIRST
// Make sure all the user routes have muid and msid in the session
// Add seller to req
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    const {db, muid} = req;
    req.muid = muid;
    req.seller = db.getSellerForUser(muid);
    return req.muid && req.seller ? next() : res.sendStatus(401);
});

//-----------------------------------------------------------------------------

module.exports = router;
