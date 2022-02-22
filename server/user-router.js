const assert = require('assert');

const express = require('express');
const multer = require('multer');

const db = require('./user-database');

//-----------------------------------------------------------------------------
// The router
//-----------------------------------------------------------------------------

const router = express.Router();

//-----------------------------------------------------------------------------

const upload = multer();

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

router.post('/settings', upload.none(), (req, res) => {
    const {user, body} = req;
    Object.keys(body).forEach((key) => {
        const value = body[key];
        db.setSetting(user.id, key, value);
    });
    const settings = db.getSettings(user.id);
    res.json(settings);
});

//-----------------------------------------------------------------------------

module.exports = router;
