const assert = require('assert');

const express = require('express');

const db = require('./user-database');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------

router.get('/settings', (req, res) => {
    const {user} = req;
    const settings = db.getSettings(user.id);
    res.json(settings);
});

router.put('/settings/:key/:value', (req, res) => {
    const {user, params: {key, value}} = req;
    assert(key);
    db.setSetting(user.id, key, value);
    const settings = db.getSettings(user.id);
    res.json(settings);
});

//-----------------------------------------------------------------------------

module.exports = router;
