
require('console-stamp')(console, {pattern: 'isoDateTime', metadata: process.pid});

const path = require('path');
const assert = require('assert');

const lockfile = require('proper-lockfile');
const ms = require('ms');

const {BC_DATABASE_DIR} = require('./barcode.config');

const HOLD_LOCK = '5 minutes';

//-----------------------------------------------------------------------------
// Obtains a lock across all processes, so that we can run scheduler jobs
// without stepping on each
//-----------------------------------------------------------------------------

function lock(name, f) {
    assert(name, 'Missing name for lock');
    const lockfilePath = path.join(BC_DATABASE_DIR, `${name}.lock`);
    return lockfile.lock(BC_DATABASE_DIR, {lockfilePath})
        .then(
            (release) => new Promise(resolve => resolve(f()))
                // Hold the lock for 5 minutes, so that quick tasks still
                // exclude each other
                .finally(() => {
                    console.log('Holding lock for', HOLD_LOCK);
                    setTimeout(release, ms(HOLD_LOCK));
                })
            ,
            () => console.log('Failed to get lock', name)
        )
}

//-----------------------------------------------------------------------------

module.exports = {
    lock
};
