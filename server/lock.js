
const path = require('path');
const assert = require('assert');

const lockfile = require('proper-lockfile');

const {BC_DATABASE_DIR} = require('./barcode.config');

//-----------------------------------------------------------------------------
// Obtains a lock across all processes, so that we can run scheduler jobs
// without stepping on each
//-----------------------------------------------------------------------------

function lock(name, f) {
    assert(name, 'Missing name for lock');
    const lockfilePath = path.join(BC_DATABASE_DIR, `${name}.lock`);
    return lockfile.lock(BC_DATABASE_DIR, {lockfilePath})
        .then(
            (release) => (new Promise((resolve) => resolve(f()))).finally(release),
            () => console.log('Failed to get database backup lock')
        )
}

//-----------------------------------------------------------------------------

module.exports = {
    lock
};
