
//-----------------------------------------------------------------------------
// This scheduler job does three things:
//
//  1.  First, it connects to the server that hosts the XenForo database via
//      SSH and then to the forum database itself. It runs a query on the
//      'upgrade' tables to get the list of currently supporting members and
//      then inserts that data into the local user database's 'supportingMembers'
//      table so that we have easy access to it. This includes information
//      about their expired membership in the last year, if any.
//
//  2.  Then, it runs another query on the same forum tables to get a list of
//      members whose membership has expired in the last 7 days and have not
//      already renewed. It goes through that list and notifies each user via
//      a PM.
//
//  3.  Finally, it looks through our newly obtained data and gets a list of
//      members whose membership will expire in the next 7 days. It sends
//      each one a PM.
//
//  It tracks whether it has already notified each user with the user
//  settings table.
//-----------------------------------------------------------------------------

const mysql = require('mysql2/promise');
const {Client} = require('ssh2');
const {fromUnixTime} = require('date-fns');
const debug = require('debug')('barcode:get-supporting-members');

const {lock} = require('../lock');
const {database: userDatabase, getSetting, setSetting, getExpiringSupportingMembers} = require('../user-database');
const {startConversation} = require('../xenforo');
const {renderMessage} = require('../messages');
const {differenceBetween} = require('../dates');

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
// Selects records that have expired in the last 7 days and don't have
// a corresponding active record
//-----------------------------------------------------------------------------

const SELECT_RECENTLY_EXPIRED =
    `
    SELECT
        expired.user_id     AS userId,
        expired.end_date    AS expiredEndDate
    FROM
        xf_user_upgrade_expired AS expired
    WHERE
        expired.end_date > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY)) AND
        expired.user_id NOT IN (SELECT user_id FROM xf_user_upgrade_active)
    `;

//-----------------------------------------------------------------------------
// This is the name of a user setting we use to remember that we have notified
// them. The value is the actual date it expired.
//-----------------------------------------------------------------------------

const NOTIFIED_EXPIRED = 'notifiedExpiredDate';

//-----------------------------------------------------------------------------
// This data comes from the mySQL XenForo database, so all dates are unit times
//-----------------------------------------------------------------------------

async function notifyExpired(rows) {
    for (const row of rows) {
        const {userId, expiredEndDate} = row;

        // If we have already notified this user, continue
        if (getSetting(userId, NOTIFIED_EXPIRED) === convert(expiredEndDate)) {
            debug('Already notified', userId);
            continue;
        }

        // Notify
        try {
            const days = differenceBetween(fromUnixTime(expiredEndDate), new Date());
            const [title, message] = await renderMessage('supporting-expired-pm', {days});
            await startConversation([userId], title, message, true);
            debug('PM sent to', userId);
            // And note it
            setSetting(userId, NOTIFIED_EXPIRED, convert(expiredEndDate));
        }
        catch (error) {
            console.error('Failed to send PM to', userId, error);
        }
    }
}

//-----------------------------------------------------------------------------
// Similar to the other one, but this one is for memberships that will be
// expiring soon
//-----------------------------------------------------------------------------

const NOTIFIED_EXPIRING = 'notifiedExpiringDate';

//-----------------------------------------------------------------------------
// We get this data from our local database so all the dates are already
// UTC ISO strings.
//-----------------------------------------------------------------------------

async function notifyExpiring() {
    // Get the list of members
    const members = getExpiringSupportingMembers();

    debug('Found', members.length, 'that are expiring soon');

    for (const member of members) {
        const {userId, activeEndDate} = member;

        // See if we have already notified this user
        if (getSetting(userId, NOTIFIED_EXPIRING) === activeEndDate) {
            debug('Already notified', userId);
            continue;
        }
        // Otherwise, notify
        debug('Notifying', userId);

        try {
            const days = differenceBetween(new Date(), activeEndDate);
            const [title, message] = await renderMessage('supporting-expiring-pm', {days});
            await startConversation([userId], title, message, true);
            debug('PM sent to', userId);
            // And note it
            setSetting(userId, NOTIFIED_EXPIRING, activeEndDate);
        }
        catch (error) {
            console.error('Failed to send PM to', userId, error);
        }
    }
}

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

        debug('Done refreshing supporting members');

        //---------------------------------------------------------------------
        // Now, we're going to take this opportunity to look for
        // recently expired members and notify them
        //---------------------------------------------------------------------

        debug('Querying for recently expired...');
        const [expired] = await connection.query(SELECT_RECENTLY_EXPIRED);
        debug('Found', expired.length, 'recently expired');
        await notifyExpired(expired);

        //---------------------------------------------------------------------
        // And, we're also going to notify those that are expiring soon
        //---------------------------------------------------------------------

        await notifyExpiring();

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
