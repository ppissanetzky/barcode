'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const express = require('express');

const debug = require('debug')('barcode:market-seller');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// THIS MUST BE FIRST
// Make sure all the user routes have muid and msid in the session
// Add muid and seller to req
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    const {db, muid} = req;
    req.muid = muid;
    req.seller = db.getSellerForUser(muid);
    return req.muid && req.seller ? next() : res.status(401).end();
});

//-----------------------------------------------------------------------------

module.exports = router;