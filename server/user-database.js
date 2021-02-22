const assert = require('assert');

const {Database} = require('./db');

//-----------------------------------------------------------------------------

const USERS_DB_VERSION = 1;

const db = new Database('user', USERS_DB_VERSION);

//-----------------------------------------------------------------------------

const SELECT_SETTINGS = 'SELECT key, value FROM settings WHERE userId = $userId';

function getSettings(userId) {
    const rows = db.all(SELECT_SETTINGS, {userId});
    return rows.reduce((result, row) => {
        result[row.key] = row.value;
        return result;
    }, {});
}

//-----------------------------------------------------------------------------

const UPDATE_SETTING = `
    INSERT INTO settings (userId, key, value)
    VALUES ($userId, $key, $value)
    ON CONFLICT (userId, key) DO
        UPDATE SET value = $value
`;

function setSetting(userId, key, value) {
    db.run(UPDATE_SETTING, {userId, key, value});
}

//-----------------------------------------------------------------------------

module.exports = {
    getSettings,
    setSetting
};