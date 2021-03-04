const assert = require('assert');

const _ = require('lodash');

const {Database, DatabaseConnection} = require('./db');
const {nowAsIsoString, utcIsoStringFromString} = require('./dates');
const {db: dbtcDatabase} = require('./dbtc-database');

//-----------------------------------------------------------------------------

const MARKET_DB_VERSION = 1;

const database = new Database('market', MARKET_DB_VERSION);

//-----------------------------------------------------------------------------

class MarketDatabaseConnection extends DatabaseConnection {

    constructor() {
        super(database);
        // Will attach the DBTC database as 'dbtc'
        this.attach(dbtcDatabase);
    }

    //-------------------------------------------------------------------------

    getSellerForUser(user) {
        // Can be undefined
        return this.first(
            `
            SELECT * FROM sellers WHERE externalUserId = $externalUserId
            `,
            {externalUserId: user.externalUserId}
        );
    }

    getSeller(sellerId) {
        // Can be undefined
        return this.first(
            `
            SELECT * FROM sellers WHERE sellerId = $sellerId
            `,
            {sellerId}
        );
    }

    //-------------------------------------------------------------------------
    // Creates a new seller and returns it
    //-------------------------------------------------------------------------

    createSeller(externalUserId, name, location) {
        const sellerId = this.run(
            `
            INSERT INTO sellers (externalUserId, linkCode, name, location)
            VALUES ($externalUserId, $linkCode, $name, $location)
            `,
            {
                externalUserId,
                linkCode: 'AAA',
                name,
                location
            }
        );
        return this.getSeller(sellerId);
    }

    //-------------------------------------------------------------------------

    updateSeller(sellerId, name, location) {
        this.run(
            `
            UPDATE sellers SET name = $name, location = $location
            WHERE sellerId = $sellerId
            `,
            {sellerId, name, location}
        );
        return this.getSeller(sellerId);
    }

    //-------------------------------------------------------------------------

    validateSourceFrag(forumUserId, fragId) {
        // Can be undefined
        return this.first(
            `
            SELECT
                *
            FROM
                motherFrags AS mf
            WHERE
                mf.fragId = $fragId AND
                mf.ownerId = $userId AND
                mf.isAlive = 1 AND
                mf.status IS NULL AND
                mf.rules = 'private'
            `,
            {userId: forumUserId, fragId}
        );
    }

    //-------------------------------------------------------------------------

    getFragListingsForMotherFrag(fragId) {
        return this.all(
            `
            SELECT * FROM fragListings WHERE fragOf = $fragId
            `,
            {fragId}
        );
    }

    //-------------------------------------------------------------------------

    createPictureSet(sellerId, maximum) {
        return this.run(
            `
            INSERT INTO pictureSets (sellerId, maximum)
            VALUES ($sellerId, $maximum)
            `,
            {sellerId, maximum}
        );
    }

    //-------------------------------------------------------------------------

    getPictureSet(sellerId, pictureSetId) {
        return this.first(
            `
            SELECT * FROM pictureSets WHERE pictureSetId = $pictureSetId AND sellerId = $sellerId
            `,
            {sellerId, pictureSetId}
        );
    }

    getPictures(pictureSetId) {
        return this.all(
            `
            SELECT idx, picture FROM pictures WHERE pictureSetId = $pictureSetId
            ORDER BY idx ASC
            `,
            {pictureSetId}
        );
    }

    getPicture(pictureSetId, idx) {
        return this.first(
            `
            SELECT idx, picture FROM pictures WHERE pictureSetId = $pictureSetId AND idx = $idx
            `,
            {pictureSetId, idx}
        );
    }

    deletePicture(pictureSetId, idx) {
        return this.change(
            `
            DELETE FROM pictures WHERE pictureSetId = $pictureSetId AND idx = $idx
            `,
            {pictureSetId, idx}
        );
    }

    addPicture(pictureSetId, picture) {
        const {idx} = this.first(
            `
            SELECT IFNULL(MAX(idx), 0) + 1 AS idx FROM pictures WHERE pictureSetId = $pictureSetId
            `,
            {pictureSetId}
        );
        this.run(
            `
            INSERT INTO pictures (pictureSetId, idx, picture)
            VALUES ($pictureSetId, $idx, $picture)
            `,
            {pictureSetId, idx, picture}
        );
        return idx;
    }

}

//-----------------------------------------------------------------------------

function connect() {
    return new MarketDatabaseConnection();
}

//-----------------------------------------------------------------------------

module.exports = connect;