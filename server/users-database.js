
const {Database} = require('./db');

//-----------------------------------------------------------------------------

const USERS_DB_VERSION = 1;

const db = new Database('users', USERS_DB_VERSION);

//-----------------------------------------------------------------------------
// Get a user by ID
//-----------------------------------------------------------------------------

const SELECT_USER = `SELECT * FROM users WHERE id = $id`;

function getUser(id) {
    const [user] = db.all(SELECT_USER, {id});
    return user;
}

//-----------------------------------------------------------------------------
// Insert a user
//-----------------------------------------------------------------------------

const INSERT_USER = `
    INSERT OR REPLACE INTO users (
        id,
        name,
        title,
        location,
        age,
        isStaff,
        registerDate,
        viewUrl,
        avatarUrl
    )
    VALUES (
        $id,
        $name,
        $title,
        $location,
        $age,
        $isStaff,
        $registerDate,
        $viewUrl,
        $avatarUrl
    )
`;

const USER_NULLABLE = {
    title: null,
    location: null,
    age: null,
    isStaff: null,
    registerDate: null,
    lastActivityDate: null,
    viewUrl: null,
    avatarUrl: null
};

function addUser(values) {
    const bindings = Object.keys(values).reduce((result, key) => {
        const value = values[key];
        if (typeof value === 'boolean') {
            result[key] = value ? 1 : 0;
        }
        else {
            result[key] = value;
        }
        return result;
    }, {});
    db.run(INSERT_USER, {
        ...USER_NULLABLE,
        ...bindings
    });
}

//-----------------------------------------------------------------------------

module.exports = {
    getUser,
    addUser
};
