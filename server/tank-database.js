'use strict';

const {Database, DatabaseConnection} = require('./db');

const {nowAsIsoString, utcIsoStringFromString} = require('./dates');

//-----------------------------------------------------------------------------

const TANK_DB_VERSION = 1;

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

    addJournal(tankId, {timestamp = null, type, subType = null,
        value = null, picture = null, note = null, isPrivate = null}) {
        timestamp = fixDate(timestamp);
        this.run(
            `INSERT INTO journals
                (tankId, timestamp, type, subType, value, picture, note, isPrivate)
            VALUES
                ($tankId, $timestamp, $type, $subType, $value, $picture, $note, $isPrivate)
            `,
            {tankId, timestamp, type, subType, value, picture, note, isPrivate}
        );
    }

    getJournals(tankId) {
        return this.all(
            'SELECT * FROM journals WHERE tankId = $tankId ORDER BY timestamp',
            {tankId}
        );
    }

    getLatestParameters(tankId) {
        return this.all(
            `
            SELECT timestamp, subType AS name, value
            FROM journals
            WHERE
                tankId = $tankId
                AND type = 'parameter'
                AND timestamp = (
                    SELECT MAX(timestamp)
                    FROM journals AS sub
                    WHERE
                        sub.tankId = journals.tankId
                        AND sub.type = journals.type
                        AND sub.subType = journals.subType
                )
            ORDER BY subType
            `, {tankId}
        );
    }
}

//-----------------------------------------------------------------------------

function connect() {
    return new TankDatabaseConnection();
}

//-----------------------------------------------------------------------------

module.exports = connect;
