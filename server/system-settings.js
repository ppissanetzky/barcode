const assert = require('assert');

const {BARCODE_USER} = require('./xenforo');
const {getSetting, setSetting} = require('./user-database');

//-----------------------------------------------------------------------------
// Default values for all settings. If not found in the database,
// these will be returned.
//-----------------------------------------------------------------------------
// THEY SHOULD ONLY BE STRINGS, NUMBERS OR BOOLEANS
//-----------------------------------------------------------------------------

const DEFAULTS = {

    //-------------------------------------------------------------------------
    // We show at most this many exchange candidates when a piece of
    // equipment is ready. Also, when we post to keep equipment moving
    //-------------------------------------------------------------------------

    equipmentReadyCandidates: 3,

};

//-----------------------------------------------------------------------------
// Make sure the types are correct
//-----------------------------------------------------------------------------

for (const [key, value] of Object.entries(DEFAULTS)) {
    const type = typeof value;
    switch (type) {
        case 'string':
        case 'number':
        case 'boolean':
            break;
        default:
            assert(false, `Invalid type (${type})for system setting "${key}"`);
    }
}

//-----------------------------------------------------------------------------
// Settings loaded from the database
//-----------------------------------------------------------------------------

const SETTINGS_KEY = 'system';

const settings = JSON.parse(getSetting(BARCODE_USER, SETTINGS_KEY)) || {};

console.log('System settings :', JSON.stringify(settings, null, 2));

//-----------------------------------------------------------------------------
// The Proxy handler
//-----------------------------------------------------------------------------

const handler = {

    get(target, prop) {
        // Return the value from our database cache if it exists there
        if (prop in settings) {
            return settings[prop];
        }
        // Otherwise, make sure the property exists in defaults
        if (!(prop in DEFAULTS)) {
            throw new Error(`No default for system setting "${prop}"`);
        }
        // And return the default value
        return Reflect.get(...arguments);
    },

    set(target, prop, value, receiver) {
        if (!(prop in DEFAULTS)) {
            throw new Error(`No default for system setting "${prop}"`);
        }
        // If the value is not the same as the existing value
        if (value !== receiver[prop]) {
            const type = typeof DEFAULTS[prop];
            if (typeof value !== type) {
                throw new TypeError(`Invalid type for system setting "${prop}" (${type}) : ${typeof value}`);
            }
            // Save it in our cache
            settings[prop] = value;
            // Store all of them in the database
            setSetting(BARCODE_USER, SETTINGS_KEY, JSON.stringify(settings));
        }
        // Return true
        return true;
    }
};

//-----------------------------------------------------------------------------

module.exports = new Proxy(DEFAULTS, handler);
