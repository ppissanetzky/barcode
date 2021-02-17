
//-----------------------------------------------------------------------------
// A job to create a daily backup of all of the databases
//-----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const BetterSqlite3 = require('better-sqlite3');

const {BC_DATABASE_DIR} = require('../barcode.config');
const {justTheLocalDate} = require('../dates');
const {lock} = require('../lock');

//-----------------------------------------------------------------------------

lock('backup-database', () => {

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
