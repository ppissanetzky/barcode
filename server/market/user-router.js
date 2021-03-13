'use strict';

const express = require('express');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// THIS MUST BE FIRST
// Make sure all the user routes have muid
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    const {muid} = req;
    return muid ? next() : res.sendStatus(401);
});

//-----------------------------------------------------------------------------

module.exports = router;
