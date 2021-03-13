
const path = require('path');
const assert = require('assert');

const lockfile = require('proper-lockfile');
const ms = require('ms');
const Debug = require('debug');

//-----------------------------------------------------------------------------

const {BC_DATABASE_DIR} = require('./barcode.config');

const HOLD_LOCK = '2 minutes';

//-----------------------------------------------------------------------------
// Obtains a lock across all processes, so that we can run scheduler jobs
// without stepping on each
//-----------------------------------------------------------------------------

function lock(name, f) {
    assert(name, 'Missing name for lock');
    const debug = Debug(`barcode:${name}`);
    const lockfilePath = path.join(BC_DATABASE_DIR, `${name}.lock`);
    return lockfile.lock(BC_DATABASE_DIR, {lockfilePath})
        .then(
            (release) => new Promise((resolve) => {
                resolve(f(debug));
            })
                // Hold the lock so that quick tasks still exclude each other
                .finally(() => {
                    debug('Holding lock for', HOLD_LOCK);
                    setTimeout(release, ms(HOLD_LOCK));
                })
            ,
            () => debug('Failed to get lock')
        );
}

//-----------------------------------------------------------------------------

module.exports = {
    lock
};
