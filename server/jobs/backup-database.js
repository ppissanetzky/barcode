
//-----------------------------------------------------------------------------
// A job to create a daily backup of all of the databases
//-----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const lockfile = require('proper-lockfile');

const BetterSqlite3 = require('better-sqlite3');

const {BC_DATABASE_DIR} = require('../barcode.config');
const {justTheLocalDate} = require('../dates');

//-----------------------------------------------------------------------------
// Use a lock file in the databases directory to make sure that only one node
// process runs this backup job at a time.
//-----------------------------------------------------------------------------

function lock(f) {
    const lockfilePath = path.join(BC_DATABASE_DIR, 'backup.lock');
    return lockfile.lock(BC_DATABASE_DIR, {lockfilePath})
        .then(
            (release) => new Promise((resolve) => resolve(f())).finally(release),
            () => console.log('Failed to get database backup lock')
        )
}

lock(() => {

    //-------------------------------------------------------------------------
    // The ISO date for today, eg '2021-02-09'
    //-------------------------------------------------------------------------

    const dateString = justTheLocalDate(new Date());

    function sourceName(name) {
        return path.join(BC_DATABASE_DIR, name);
    }

    function backupName(name) {
        return path.join(BC_DATABASE_DIR, `${name}.${dateString}`);
    }

    //-------------------------------------------------------------------------
    // Look for all files that end with .sqlite3 in the databases directory and
    // remove any that have a backup file for today
    //-------------------------------------------------------------------------

    const files = fs.readdirSync(BC_DATABASE_DIR)
        .filter((name) => name.endsWith('.sqlite3'))
        .filter((name) => !fs.existsSync(backupName(name)));

    //-------------------------------------------------------------------------
    // Now, back up each one
    //-------------------------------------------------------------------------

    return Promise.all(files.map(async (name) => {
        const destination = backupName(name);
        console.log('Starting backup', destination);
        const db = new BetterSqlite3(sourceName(name));
        await db.backup(destination);
        console.log('Finished backup', destination);
    }));
});
