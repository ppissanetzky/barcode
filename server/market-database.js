const assert = require('assert');

const _ = require('lodash');

const {nowAsIsoString, utcIsoStringFromString} = require('./dates');
const {BC_MARKET_ENABLED} = require('./barcode.config');
const dbtc = require('./dbtc-database');
const {db} = dbtc;

//-----------------------------------------------------------------------------

function validateSourceFrag(userId, fragId) {
    const frag = dbtc.validateFrag(userId, fragId, true, -1);
    if (!frag) {
        return;
    }
    if (!frag.rules === 'private') {
        return;
    }
    if (frag.fragOf) {
        return;
    }
    return frag;
}

//-----------------------------------------------------------------------------

function getFragsForSale(fragOf) {
    const SELECT = 'SELECT * FROM fragsForSale WHERE fragOf = $fragOf';
    return db.all(SELECT, {fragOf});
}

//-----------------------------------------------------------------------------

module.exports = {
    validateSourceFrag,
    getFragsForSale
};