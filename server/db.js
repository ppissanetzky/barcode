
const sqlite3 = require('sqlite3');

//-----------------------------------------------------------------------------
// An async wrapper around sqlite that just stores the path and uses a cached
// connection to run every statement
//-----------------------------------------------------------------------------

class Database {

    constructor(path) {
        this.path = path;
    }

    // Returns the rows

    async all(query, params) {
        const {path} = this;
        return new Promise((resolve, reject) => {
            // Intentional function because of 'this'
            new sqlite3.cached.Database(path, function(error) {
                if (error) {
                    return reject(error);
                }
                // this is the sqlite3 Database
                this.all(query, params, (error, rows) =>
                    error ? reject(error) : resolve(rows))
            });
        });
    }

    // Returns the last row ID

    async run(query, params) {
        const {path} = this;
        return new Promise((resolve, reject) => {
            // Intentional function because of 'this'
            new sqlite3.cached.Database(path, function(error) {
                if (error) {
                    return reject(error);
                }
                // Intentional function because of 'this'. 'this' is the
                // sqlite3 database
                this.run(query, params, function(error) {
                    if (error) {
                        return reject(error);
                    }
                    // 'this' is the statement and lets us access the last row ID
                    return resolve(this.lastID);
                });
            });
        });
    }
}

module.exports = {
    Database
};
