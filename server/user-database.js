const assert = require('assert');

const {Database} = require('./db');

const {addDays, utcIsoStringFromDate} = require('./dates');

//-----------------------------------------------------------------------------

const USERS_DB_VERSION = 3;

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

function getSetting(userId, key) {
    const result = db.connect().first(
        'SELECT value FROM settings WHERE userId = $userId AND key = $key',
        {userId, key}
    );
    return result ? result.value : null;
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

function getExpiringSupportingMembers() {
    const oneWeekFromToday = utcIsoStringFromDate(addDays(new Date(), 7));
    return db.all(
        `
        SELECT
            userId, activeEndDate
        FROM
            supportingMembers
        WHERE
            activeEndDate <= $oneWeekFromToday
        `,
        {oneWeekFromToday});
}

//-----------------------------------------------------------------------------

module.exports = {
    database: db,
    getSettings,
    getSetting,
    setSetting,
    getExpiringSupportingMembers
};