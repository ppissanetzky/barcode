
const path = require('path');
const fs = require('fs');

const BetterSqlite3 = require('better-sqlite3');

//-----------------------------------------------------------------------------
// Function to get runtime configuration from the environment
//-----------------------------------------------------------------------------

const {BC_DATABASE_DIR} = require('./barcode.config');

//-----------------------------------------------------------------------------
// A persistent connection
//-----------------------------------------------------------------------------

class DatabaseConnection {

    constructor(database) {
        this.bs3 = database.open();
    }

    // Attaches the other database to this one, using its name
    attach(database) {
        const {file, name} = database;
        this.run('ATTACH $file AS $name', {file, name});
    }

    // Returns an array of rows - which can be empty
    all(query, params) {
        const statement = this.bs3.prepare(query);
        return statement.all(params || {});
    }

    // Returns just the first row or undefined if there are no rows
    first(query, params) {
        const statement = this.bs3.prepare(query);
        return statement.get(params || {});
    }

    // Returns the last row ID
    run(query, params) {
        const statement = this.bs3.prepare(query);
        const info = statement.run(params || {});
        return info.lastInsertRowid;
    }

    // Returns the changes
    change(query, params) {
        const statement = this.bs3.prepare(query);
        const info = statement.run(params || {});
        return info.changes;
    }

    transaction(func) {
        const executor = this.bs3.transaction(func);
        return executor();
    }

    statement(query) {
        return this.bs3.prepare(query);
    }
}

//-----------------------------------------------------------------------------
// An async wrapper around sqlite that just stores the path and uses a new
// connection to run every statement or transaction
//-----------------------------------------------------------------------------

class Database {

    constructor(name, version) {
        this.name = name;
        this.file = path.join(BC_DATABASE_DIR, `${name}.sqlite3`);
        this.version = version;
        this.migrated = false;
        // Open it once now to migrate it if necessary
        this.open();
    }

    connect() {
        return new DatabaseConnection(this);
    }

    // Returns all the rows or an empty array
    all(query, params) {
        const connection = new DatabaseConnection(this);
        return connection.all(query, params);
    }

    // Returns the first row, or undefined
    first(query, params) {
        const connection = new DatabaseConnection(this);
        return connection.first(query, params);
    }

    // Returns the last row ID
    run(query, params) {
        const connection = new DatabaseConnection(this);
        return connection.run(query, params);
    }

    // Returns the number of changed rows
    change(query, params) {
        const connection = new DatabaseConnection(this);
        return connection.change(query, params);
    }

    transaction(func) {
        const connection = new DatabaseConnection(this);
        const all = connection.all.bind(connection);
        const run = connection.run.bind(connection);
        const change = connection.change.bind(connection);
        const first = connection.first.bind(connection);
        return connection.transaction(() => func({all, run, change, first}));
    }

    //-------------------------------------------------------------------------
    // Open and migrate the database if necessary
    //-------------------------------------------------------------------------

    open() {
        const {name, file, version, migrated} = this;
        let db;
        try {
            db = new BetterSqlite3(file);
            // If we have already migrated it, return it
            if (migrated) {
                return db;
            }

            // Check the version with this pragma
            let [{user_version: userVersion}] = db.pragma('user_version');

            // If it is already at the desired version mark it as migrated
            // and return it
            if (userVersion === version) {
                this.migrated = true;
                return db;
            }

            console.log(name, 'database is version', userVersion, 'requesting version', version);

            // If it is at a higher version than the desired one, there is
            // a problem and we should not continue.
            if (userVersion > version) {
                throw new Error(`It has later version ${userVersion}`);
            }

            // Now, try to get to the desired version
            while (userVersion < version) {
                // Look for a script to get us to the next version
                const nextVersion = userVersion + 1;
                const migrationScript = path.join(__dirname, 'database', name, `v${nextVersion}.sql`);
                console.log('Migrating to version', nextVersion, 'with', migrationScript);

                // Load and execute the script. It should create its own
                // transaction
                const script = fs.readFileSync(migrationScript, 'utf-8');
                db.exec(script);

                // Now, read the new version, which the script should have set
                [{user_version: userVersion}] = db.pragma('user_version');

                // This is because the script didn't set it, so it is a
                // programmatic error
                if (userVersion !== nextVersion) {
                    throw new Error(`After running ${migrationScript}, the version is ${userVersion} and we were expecting ${nextVersion}`);
                }
            }

            // We reached the desired version, so add it to the map and return it
            console.log(`Finished migrating ${file} to version ${version}`);
            this.migrated = true;
            return db;
        }
        catch (error) {
            // If we opened it, close it just for grins
            if (db) {
                db.close();
            }
            console.error(`Failed to open database ${file} version ${version}`);
            console.error(error);
            throw error;
        }
    }
}

//-----------------------------------------------------------------------------

module.exports = {
    Database,
    DatabaseConnection
};
