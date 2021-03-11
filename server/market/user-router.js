'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const express = require('express');
const multer = require('multer');

const debug = require('debug')('barcode:market-user');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------
// THIS MUST BE FIRST
// Make sure all the user routes have muid in the session and add it to req
//-----------------------------------------------------------------------------

router.use((req, res, next) => {
    const {muid} = req;
    return muid ? next() : res.status(401).end();
});

/*
router.get('/', (req, res) => {
    const {session} = req;
    debug(session);
    res.status(200).end();
});
*/
//-----------------------------------------------------------------------------


module.exports = router;