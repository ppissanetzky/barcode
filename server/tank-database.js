'use strict';

const _ = require('lodash');

const {Database, DatabaseConnection} = require('./db');

const {nowAsIsoString, utcIsoStringFromString, toUnixTime, nowAsUnixTime} = require('./dates');

//-----------------------------------------------------------------------------

const TANK_DB_VERSION = 3;

const database = new Database('tank', TANK_DB_VERSION);

//-----------------------------------------------------------------------------

function fixDate(date) {
    return date ? utcIsoStringFromString(date) : nowAsIsoString();
}

//-----------------------------------------------------------------------------

class TankDatabaseConnection extends DatabaseConnection {

    constructor() {
        super(database);
    }

    getTanksForUser(userId) {
        return this.all(
            'SELECT * FROM tanks WHERE userId = $userId',
            {userId});
    }

    getTankForUser(userId, tankId) {
        // Can return undefined
        return this.first(
            'SELECT * FROM tanks WHERE userId = $userId AND tankId = $tankId',
            {userId, tankId});
    }

    addTank({userId, name, model = null, dimensions = null, displayVolume, totalVolume, dateStarted,
        description = null, threadId = null}) {
        dateStarted = fixDate(dateStarted);
        const tankId = this.run(
            `INSERT INTO tanks
                (userId, name, model, dimensions, displayVolume, totalVolume,
                    dateStarted, description, threadId)
            VALUES
                ($userId, $name, $model, $dimensions, $displayVolume, $totalVolume,
                    $dateStarted, $description, $threadId)
            `,
            {userId, name, model, dimensions, displayVolume, totalVolume,
                dateStarted, description, threadId}
        );
        return tankId;
    }

    getEntryTypes() {
        return this.all('SELECT * FROM entryTypes ORDER BY entryTypeId');
    }

    getEntryType(entryTypeId) {
        return this.first(
            'SELECT * FROM entryTypes WHERE entryTypeId = $entryTypeId',
            {entryTypeId}
        );
    }

    //-------------------------------------------------------------------------
    // 'time' can be null or an ISO string date/time
    //-------------------------------------------------------------------------

    addEntry(tankId, {entryTypeId, time = null, value = null, comment = null, isPrivate = null}) {
        // If 'time' came in as a number, we assume it is already unix time
        if (!_.isNumber(time)) {
            time = time ? toUnixTime(time) : nowAsUnixTime();
        }
        return this.run(
            `
            INSERT INTO entries
                (tankId, entryTypeId, time, value, comment, isPrivate)
            VALUES
                ($tankId, $entryTypeId, $time, $value, $comment, $isPrivate)
            `,
            {tankId, entryTypeId, time, value, comment, isPrivate}
        );
    }

    // Find an entry, given tankId, time, type and value

    findEntry(tankId, entryTypeId, time, value) {
        return this.first(
            `
            SELECT * FROM entries
            WHERE
                tankId = $tankId AND
                entryTypeId = $entryTypeId AND
                time = $time AND
                value = $value
            `,
            {tankId, entryTypeId, time, value}
        );
    }

    deleteEntry(tankId, rowid) {
        return this.change(
            `
            DELETE FROM entries WHERE tankId = $tankId AND rowid = $rowid
            `,
            {tankId, rowid}
        );
    }

    updateEntry({rowid, value, comment, time}) {
        return this.change(
            `
            UPDATE entries
            SET
                value = $value,
                comment = $comment,
                time = $time
            WHERE
                rowid = $rowid
            `,
            {rowid, value, comment, time}
        );
    }

    getEntries(tankId) {
        return this.all(
            'SELECT rowid, * FROM entries WHERE tankId = $tankId ORDER BY time DESC',
            {tankId}
        );
    }

    getEntry(tankId, rowid) {
        return this.first(
            `
            SELECT e.rowid AS rowid, *
            FROM entryTypes AS et, entries AS e
            WHERE
                e.tankId = $tankId
                AND e.rowid = $rowid
                AND et.entryTypeId = e.entryTypeId
            `,
            {tankId, rowid}
        );
    }

    getLatestParameters(tankId, tracked) {
        return this.all(
            `
            SELECT
                et.*,
                e.time AS time,
                e.value AS value,
                e.comment AS comment,
                e.isPrivate AS isPrivate
            FROM
                entryTypes AS et,
                entries AS e
            WHERE
                e.entryTypeId = et.entryTypeId
                AND e.tankId = $tankId
                AND $tracked = IFNULL(et.isTracked, 0)
                AND time = (
                    SELECT MAX(time)
                    FROM entries AS sub
                    WHERE
                        sub.tankId = $tankId AND
                        sub.entryTypeId = et.entryTypeId
                )
            ORDER BY
                et.entryTypeId
            `, {tankId, tracked: tracked ? 1 : 0}
        );
    }
}

//-----------------------------------------------------------------------------

function connect() {
    return new TankDatabaseConnection();
}

//-----------------------------------------------------------------------------

module.exports = connect;
