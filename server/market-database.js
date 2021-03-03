const assert = require('assert');

const _ = require('lodash');

const {Database, DatabaseConnection} = require('./db');
const {nowAsIsoString, utcIsoStringFromString} = require('./dates');
const dbtc = require('./dbtc-database');

//-----------------------------------------------------------------------------

const MARKET_DB_VERSION = 1;

const database = new Database('market', MARKET_DB_VERSION);

//-----------------------------------------------------------------------------

class MarketDatabaseConnection extends DatabaseConnection {

    constructor() {
        super(database);
    }

    //-------------------------------------------------------------------------

    getSellerWithUserId(userIdSource, userId) {
        const [seller] = this.all(
            'SELECT * FROM sellers WHERE userIdSource = $userIdSource AND userId = $userId',
            {userIdSource, userId: String(userId)}
        );
        // Can be undefined
        return seller;
    }

    getSeller(sellerId) {
        const [seller] = this.all(
            'SELECT * FROM sellers WHERE sellerId = $sellerId',
            {sellerId}
        );
        // Can be undefined
        return seller;
    }

    //-------------------------------------------------------------------------

    validateSourceFrag(userId, fragId) {
        const frag = dbtc.validateFrag(userId, fragId, true, -1);
        if (frag && frag.rules === 'private' && !frag.fragOf) {
            return frag;
        }
    }

    //-------------------------------------------------------------------------

    getFragListingsForMotherFrag(fragId) {
        return this.all(
            'SELECT * FROM fragListings WHERE fragOf = $fragId',
            {fragId}
        );
    }

    //-------------------------------------------------------------------------
    // Creates a new seller and returns it
    //-------------------------------------------------------------------------

    createSellerFromUser(user, location) {
        const INSERT = `
            INSERT INTO sellers (
                userIdSource, userId, linkCode, name, location
            )
            VALUES (
                $userIdSource, $userId, $linkCode, $name, $location
            )
        `;
        const sellerId = this.run(INSERT, {
            userIdSource: user.userIdSource,
            userId: String(user.id),
            linkCode: 'AAA',
            name: user.name,
            location: location
        });
        return this.getSeller(sellerId);
    }
}

//-----------------------------------------------------------------------------

function connect() {
    return new MarketDatabaseConnection();
}

//-----------------------------------------------------------------------------

module.exports = connect;