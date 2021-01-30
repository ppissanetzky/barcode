
//-----------------------------------------------------------------------------
// This will read the values from the .env file and put them in process.env
//-----------------------------------------------------------------------------

require('dotenv').config()

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

    get BC_PRODUCTION() { return PRODUCTION },

    //-------------------------------------------------------------------------
    // This is the API key we need to access the XenForo rest API. It should
    // never be in git.
    //-------------------------------------------------------------------------

    get BC_XF_API_KEY () { return get('BC_XF_API_KEY') },

    //-------------------------------------------------------------------------
    // This is the base URL for the site.
    //
    // When developing, it should be 'http://localhost:3000/bc
    //
    // In production, it should be 'https://bareefers.org/bc
    //-------------------------------------------------------------------------

    get BC_SITE_BASE_URL () { return get('BC_SITE_BASE_URL') },

    //-------------------------------------------------------------------------
    // This one has to be provided to the client BUILD. It points to the URL
    // that the BC API server is listening on.
    //
    // For development, it should be 'http://localhost:3003'
    //
    // For production, it should be 'https://bareefers.org'. The client will
    // add '/bc/api' to these calls and the web server will redirect these
    // calls to our server.
    //-------------------------------------------------------------------------

    get BC_API_URL () { return get('BC_API_URL') },

    //-------------------------------------------------------------------------
    // This one has to be provided to the client BUILD. It points to the URL
    // that serves uploaded images.
    //
    // For development, on my machine, it is 'http://localhost/uploads' because
    // I have a local web server that serves the uploaded images from that URL.
    //
    // For production, it should be 'https://bareefers.org/bc/uploads'
    //-------------------------------------------------------------------------

    get BC_UPLOADS_URL () { return get('BC_UPLOADS_URL') },

    //-------------------------------------------------------------------------
    // This has to be provided to the server at RUNTIME. It is the local
    // directory where uploaded images will be stored.
    //
    // For development, on my machine, it is '/var/www/html/uploads' because
    // that's my web server's root directory for BC_UPLOADS_URL.
    //
    // For production, it should be '/home/admin3/bc-data/uploads'
    //-------------------------------------------------------------------------

    get BC_UPLOADS_DIR () { return get('BC_UPLOADS_DIR') },

    //-------------------------------------------------------------------------
    // This has to be provided to the server at RUNTIME. It is the local
    // directory where the databases live.
    //
    // For development, it can be anywhere, such as /tmp
    //
    // For production, it should be '/home/admin3/bc-data/database'

    get BC_DATABASE_DIR () { return get('BC_DATABASE_DIR') },

    //-------------------------------------------------------------------------
    // This is only for development, so we can run the server as if
    // all requests come from this user. This one is different in that
    // we don't crash if it is missing.
    //-------------------------------------------------------------------------

    get BC_TEST_USER () { return PRODUCTION ? undefined : process.env.BC_TEST_USER },

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

    get BC_FORUM_MODE () { return get('BC_FORUM_MODE') },

    //-------------------------------------------------------------------------
};

//-----------------------------------------------------------------------------

function get(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`MISSING ENVIRONMENT VARIABLE "${name}", SEE barcode.config.js`);
        process.exit(2);
    }
    // console.warn(`${name}=${value}`);
    return value;
}
