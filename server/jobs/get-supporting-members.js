
const mysql = require('mysql2/promise');
const {Client} = require('ssh2');
const {fromUnixTime} = require('date-fns');
const debug = require('debug')('barcode:get-supporting-members');

const {lock} = require('../lock');
const {database: userDatabase} = require('../user-database');

//-----------------------------------------------------------------------------

const {BC_XF_DB_SSH_CREDENTIALS, BC_XF_DB_CREDENTIALS} = require('../barcode.config');

//-----------------------------------------------------------------------------
// Waits until SSH is ready, connects to the host and creates a tunnel for
// the given destination port
//-----------------------------------------------------------------------------

async function createSSHStream(client, options) {
    await new Promise((resolve) => client.on('ready', resolve).connect(options));
    const stream = await new Promise((resolve, reject) => {
        client.forwardOut('127.0.0.1', 12345, '127.0.0.1', options.destinationPort,
            (error, stream) => error ? reject(error) : resolve(stream));
    });
    return stream;
}

//-----------------------------------------------------------------------------
// Converts a unix time to an ISO string or returns null if the unix time is
// falsy
//-----------------------------------------------------------------------------

function convert(unixTime) {
    return unixTime ? fromUnixTime(unixTime).toISOString() : null;
}

//-----------------------------------------------------------------------------
// Select all active supporting members and count how many days they have been
// active. Look for an expired record in the last year and count how many days
// they were active during that year.
//
// All dates are Unix times.
//-----------------------------------------------------------------------------

const SELECT_SUPPORTING_MEMBERS =
    `
    SELECT
        active.user_id      AS userId,
        active.start_date   AS activeStartDate,
        active.end_date     AS activeEndDate,
        DATEDIFF(FROM_UNIXTIME(LEAST(active.end_date, UNIX_TIMESTAMP())), FROM_UNIXTIME(active.start_date)) AS activeDays,
        expired.start_date  AS expiredStartDate,
        expired.end_date    AS expiredEndDate,
        IFNULL(DATEDIFF(FROM_UNIXTIME(expired.end_date), DATE_SUB(NOW(), INTERVAL 1 YEAR)), 0) as expiredDays
    FROM
        xf_user_upgrade_active AS active
    LEFT OUTER JOIN
        xf_user_upgrade_expired AS expired
    ON
        expired.user_id = active.user_id AND
        expired.user_upgrade_id = active.user_upgrade_id AND
        expired.end_date >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 1 YEAR))
    WHERE
        active.user_upgrade_id = 1
    `;

//-----------------------------------------------------------------------------

async function getSupportingMembers() {

    const ssh = new Client();

    try {
        // Get all these values from the config variable
        const [host, port, username, password, destinationPort] =
            BC_XF_DB_SSH_CREDENTIALS.split(',');

        debug('Creating SSH tunnel...');

        // Create the SSH tunnel and get it's stream
        const stream = await createSSHStream(ssh, {
            host,
            port,
            username,
            password,
            destinationPort,
            debug: (message) => debug('SSH:', message)
        });

        // Connect to the XenForo mySQL database

        debug('Creating database connection...');

        const [databaseName, dbUser, dbPassword] =
            BC_XF_DB_CREDENTIALS.split(',');

        const connection = await mysql.createConnection({
            host     : '127.0.0.1',
            database : databaseName,
            user     : dbUser,
            password : dbPassword,
            stream   : stream
        });

        debug('Connecting to database...');

        await connection.connect();

        // Run the query and get all records
        debug('Running query...');

        const [rows] = await connection.query(SELECT_SUPPORTING_MEMBERS);

        debug('Got', rows.length, 'rows');

        // Create a connection to our local user database and start
        // a transaction

        const db = userDatabase.connect();

        db.transaction(() => {

            // Delete all existing rows
            const deleted = db.change('DELETE FROM supportingMembers');
            debug('Deleted', deleted, 'rows');

            // Now, create an insert statement
            const statement = db.statement(
                `
                INSERT INTO supportingMembers (
                    userId,
                    activeStartDate,
                    activeEndDate,
                    activeDays,
                    expiredStartDate,
                    expiredEndDate,
                    expiredDays
                )
                VALUES (
                    $userId,
                    $activeStartDate,
                    $activeEndDate,
                    $activeDays,
                    $expiredStartDate,
                    $expiredEndDate,
                    $expiredDays
                )`
            );

            // Run the insert statement for each row we got from XenForo
            debug('Inserting rows...');
            let inserted = 0;

            for (const row of rows) {
                const {
                    userId,
                    activeStartDate,
                    activeEndDate,
                    activeDays,
                    expiredStartDate,
                    expiredEndDate,
                    expiredDays
                } = row;

                const {changes} = statement.run({
                    userId,
                    activeStartDate: convert(activeStartDate),
                    activeEndDate: convert(activeEndDate),
                    activeDays,
                    expiredStartDate: convert(expiredStartDate),
                    expiredEndDate: convert(expiredEndDate),
                    expiredDays
                });

                inserted += changes;
            }

            debug('Inserted', inserted, 'rows');
        });

        debug('Done');
    }
    finally {
        // End the SSH tunnel
        ssh.end();
    }
}

//-----------------------------------------------------------------------------
// Obtain a lock and run the function
//-----------------------------------------------------------------------------

lock('get-supporting-members', getSupportingMembers);
