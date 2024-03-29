
const os = require('os');
const path = require('path');

//-----------------------------------------------------------------------------
// This will read the values from the .env file and put them in process.env
//-----------------------------------------------------------------------------

require('dotenv').config({
    path: path.join(os.homedir(), 'barcode-env')
});

//-----------------------------------------------------------------------------

const PRODUCTION = process.env.NODE_ENV === 'production';

//-----------------------------------------------------------------------------
// This is very important configuration that is needed both by the client
// build and the server. It all comes from the environment but in the case of
// the client build, it gets baked in to the client. So, make sure it is set
// correctly when building for production or running the server in production
//-----------------------------------------------------------------------------

module.exports = {

    //-------------------------------------------------------------------------
    // Just a wrapper for the NODE_ENV environment variable
    //-------------------------------------------------------------------------

    get BC_PRODUCTION() {
        return PRODUCTION;
    },

    //-------------------------------------------------------------------------
    // The URL to the XenForo API
    //-------------------------------------------------------------------------

    get BC_XF_API_URL() {
        return get('BC_XF_API_URL');
    },

    //-------------------------------------------------------------------------
    // This is the API key we need to access the XenForo rest API. It should
    // never be in git.
    //-------------------------------------------------------------------------

    get BC_XF_API_KEY() {
        return get('BC_XF_API_KEY');
    },

    //-------------------------------------------------------------------------
    // This is the base URL for the site.
    //
    // When developing, it should be 'http://localhost:3000/bc
    //
    // In production, it should be 'https://bareefers.org/bc
    //-------------------------------------------------------------------------

    get BC_SITE_BASE_URL() {
        return get('BC_SITE_BASE_URL');
    },

    //-------------------------------------------------------------------------
    // This has to be provided to the server at RUNTIME. It is the local
    // directory where uploaded images will be stored.
    //
    // For development, on my machine, it is '/var/www/html/uploads'
    //
    // For production, it should be '/home/admin3/bc-data/uploads'
    //-------------------------------------------------------------------------

    get BC_UPLOADS_DIR() {
        return get('BC_UPLOADS_DIR');
    },

    //-------------------------------------------------------------------------
    // This has to be provided to the server at RUNTIME. It is the local
    // directory where the databases live.
    //
    // For development, it can be anywhere, such as /tmp
    //
    // For production, it should be '/home/admin3/bc-data/database'

    get BC_DATABASE_DIR() {
        return get('BC_DATABASE_DIR');
    },

    //-------------------------------------------------------------------------
    // This is only for development, so we can run the server as if
    // all requests come from this user. This one is different in that
    // we don't crash if it is missing.
    //-------------------------------------------------------------------------

    get BC_TEST_USER() {
        return PRODUCTION ? undefined : process.env.BC_TEST_USER;
    },

    //-------------------------------------------------------------------------
    // This has to be set to the string 'production' in order for forum
    // posting to be enabled and use the forums in the 'types' table of the
    // database. If it is set to anything else, that will be used as the forum
    // ID for all forum posts. If it is zero, the application will not attempt
    // to post to any forum. This is to prevent posting to the real forums
    // while testing.
    //
    // Our official test forum ID is 102
    //-------------------------------------------------------------------------

    get BC_FORUM_MODE() {
        return get('BC_FORUM_MODE');
    },

    //-------------------------------------------------------------------------
    // If this is 'production', we will send actual SMS messages using the AWS
    // SNS service - which costs money. Otherwise, we will print the messages
    // on the API server console.
    //-------------------------------------------------------------------------

    get BC_SMS_MODE() {
        return get('BC_SMS_MODE');
    },

    //-------------------------------------------------------------------------
    // Disable the scheduler when developing
    //-------------------------------------------------------------------------

    get BC_DISABLE_SCHEDULER() {
        return get('BC_DISABLE_SCHEDULER', true);
    },

    //-------------------------------------------------------------------------
    // Enable the market
    //-------------------------------------------------------------------------

    get BC_MARKET_ENABLED() {
        return get('BC_MARKET_ENABLED', true);
    },

    //-------------------------------------------------------------------------
    // This is a comma-separated string of secrets that are used to sign
    // session cookies. It should be specified in barcode-env and never
    // checked in.
    //
    // The first secret in the array is used to sign, but all of them are
    // used to verify. This allows us to rotate secretes by adding a new one
    // as the first one in the list. If we change the first one (instead of
    // adding a new one) then existing session cookies will no longer work.
    //
    // See https://github.com/expressjs/session#secret
    //-------------------------------------------------------------------------

    get BC_SESSION_COOKIE_SECRETS() {
        return get('BC_SESSION_COOKIE_SECRETS');
    },

    //-------------------------------------------------------------------------
    // This is the name of the session cookie and should be different for every
    // installation of BARcode. It is not a secret, so it can be checked in
    //-------------------------------------------------------------------------

    get BC_SESSION_COOKIE_NAME() {
        return get('BC_SESSION_COOKIE_NAME');
    },

    //-------------------------------------------------------------------------
    // This must always be 'production' in production, but can be something
    // else during development.
    //-------------------------------------------------------------------------

    get BC_SESSION_COOKIE_SECURE() {
        return get('BC_SESSION_COOKIE_SECURE');
    },

    //-------------------------------------------------------------------------
    // This contains credentials we use to log in to the server that has the
    // XF database via SSH so we can access the database.
    // It has 5 parts that are separated by a comma.
    // The parts are <host>,<ssh port>,<username>,<password>,<database port>
    // The values should be in barcode-env and never checked in to the repo.
    //-------------------------------------------------------------------------

    get BC_XF_DB_SSH_CREDENTIALS() {
        return get('BC_XF_DB_SSH_CREDENTIALS');
    },

    //-------------------------------------------------------------------------
    // This contains credentials to access the XenForo database. It has 3
    // comma separated parts: <database name>,<user name>,<password>
    // The values should be in barcode-env and never checked in to the repo.
    //-------------------------------------------------------------------------

    get BC_XF_DB_CREDENTIALS() {
        return get('BC_XF_DB_CREDENTIALS');
    },

    //-------------------------------------------------------------------------
    // Facebook app ID and secret for Facebook login in the market
    //-------------------------------------------------------------------------

    get BCM_FACEBOOK_APP_ID() {
        return get('BCM_FACEBOOK_APP_ID');
    },

    get BCM_FACEBOOK_APP_SECRET() {
        return get('BCM_FACEBOOK_APP_SECRET');
    },

    //-------------------------------------------------------------------------
    // Google API key
    //-------------------------------------------------------------------------

    get BC_GOOGLE_API_KEY() {
        return get('BC_GOOGLE_API_KEY');
    }

};

//-----------------------------------------------------------------------------

function get(name, optional) {
    const value = process.env[name];
    if (!value && !optional) {
        console.error(`MISSING ENVIRONMENT VARIABLE "${name}", SEE barcode.config.js`);
        process.exit(2);
    }
    // Console.warn(`${name}=${value}`);
    return value;
}
