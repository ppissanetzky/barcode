'use strict';

const {Database, DatabaseConnection} = require('../db');

//-----------------------------------------------------------------------------

const MARKET_DB_VERSION = 2;

const database = new Database('market', MARKET_DB_VERSION);

//-----------------------------------------------------------------------------

class MarketDatabaseConnection extends DatabaseConnection {

    constructor() {
        super(database);
    }

    getUser(muid) {
        return this.first(
            'SELECT * FROM users WHERE muid = $muid',
            {muid}
        );
    }

    getUserName(muid) {
        const user = this.getUser(muid);
        return user ? user.name : undefined;
    }

    addUser(muid, source, name, email) {
        this.run(
            'INSERT INTO users VALUES ($muid, $source, $name, $email)',
            {muid, source, name, email}
        );
        return this.getUser(muid);
    }

    //-------------------------------------------------------------------------

    getSellerForUser(muid) {
        // Can be undefined
        return this.first(
            'SELECT * FROM sellers WHERE muid = $muid',
            {muid}
        );
    }

    getSellerIdForUser(muid) {
        const {msid} = this.getSellerForUser(muid) || {};
        return msid;
    }

    isSeller(muid) {
        return Boolean(this.getSellerIdForUser(muid));
    }

    getSeller(msid) {
        // Can be undefined
        return this.first(
            'SELECT * FROM sellers WHERE msid = $msid',
            {msid}
        );
    }

    /// OLD BELOW *****************

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
