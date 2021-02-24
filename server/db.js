
const path = require('path');
const fs = require('fs');

const BetterSqlite3 = require('better-sqlite3');

//-----------------------------------------------------------------------------
// Function to get runtime configuration from the environment
//-----------------------------------------------------------------------------

const BarcodeConfig = require('./barcode.config');

const BC_DATABASE_DIR = BarcodeConfig.BC_DATABASE_DIR;

//-----------------------------------------------------------------------------

function all(bs3, query, params) {
    const statement = bs3.prepare(query);
    return statement.all(params || {});
}

// Returns the last row ID

function run(bs3, query, params) {
    const statement = bs3.prepare(query);
    const info = statement.run(params || {});
    return info.lastInsertRowid;
}

//-----------------------------------------------------------------------------
// An async wrapper around sqlite that just stores the path and uses a cached
// connection to run every statement
//-----------------------------------------------------------------------------

class Database {

    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.migrated = false;
        // Open it once now to migrate it if necessary
        this.open();
    }

    // Returns the rows

    all(query, params) {
        return all(this.open(), query, params);
    }

    // Returns the last row ID

    run(query, params) {
        return run(this.open(), query, params);
    }

    transaction(func) {
        const db = this.open();
        const executor = db.transaction(func);
        return executor({
            run: run.bind(null, db),
            all: all.bind(null, db)
        });
    }

    //-------------------------------------------------------------------------
    // Open and migrate the database if necessary
    //-------------------------------------------------------------------------

    open() {
        const {name, version, migrated} = this;
        let db;
        // The full file name of the database file
        const file = path.join(BC_DATABASE_DIR, `${name}.sqlite3`);
        try {
            // If we have already migrated it, return a new DB
            if (migrated) {
                db = new BetterSqlite3(file);
                return db;
            }
            // Otherwise, open it and see what version it currently is
            db = new BetterSqlite3(file);

            // Check the version with this pragma
            let [{user_version}] = db.pragma('user_version');

            // If it is already at the desired version, add it to the map
            // so we won't check it again and return it
            if (user_version === version) {
                console.log(name, 'database is version', user_version);
                this.migrated = true;
                return db;
            }

            console.log(name, 'database is version', user_version, 'requesting version', version);

            // If it is at a higher version than the desired one, there is
            // a problem and we should not continue.
            if (user_version > version) {
                throw new Error(`It has later version ${user_version}`);
            }

            // Now, try to get to the desired version
            while (user_version < version) {
                // Look for a script to get us to the next version
                const nextVersion = user_version + 1;
                const migrationScript = path.join(__dirname, 'database', name, `v${nextVersion}.sql`);
                console.log('Migrating to version', nextVersion, 'with', migrationScript);

                // Load and execute the script. It should create its own
                // transaction
                const script = fs.readFileSync(migrationScript, 'utf-8');
                db.exec(script);

                // Now, read the new version, which the script should have set
                [{user_version}] = db.pragma('user_version');

                // This is because the script didn't set it, so it is a
                // programmatic error
                if (user_version != nextVersion) {
                    throw new Error(`After running ${migrationScript}, the version is ${user_version} and we were expecting ${nextVersion}`);
                }
            }

            // We reached the desired version, so add it to the map and return it
            console.log(`Finished migrating ${file} to version ${version}`);
            this.migrated = true;
            return db;
        }
        catch(error) {
            // If we opened it, close it just for grins
            if (db) {
                db.close();
            }
            console.error(`Failed to open database ${file} version ${version}`);
            console.error(error);
            // TODO: exit?
        }
    }
}

//-----------------------------------------------------------------------------

module.exports = {
    Database
};
