
//-----------------------------------------------------------------------------
// This is very important configuration that is needed both by the client
// build and the server. It all comes from the environment but in the case of
// the client build, it gets baked in to the client. So, make sure it is set
// correctly when building for production or running the server in production
//-----------------------------------------------------------------------------

module.exports = {

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

    get BC_API_URL () { return get('BC_API_URL'); },

    //-------------------------------------------------------------------------
    // This one has to be provided to the client BUILD. It points to the URL
    // that serves uploaded images.
    //
    // For development, on my machine, it is 'http://localhost/uploads' because
    // I have a local web server that serves the uploaded images from that URL.
    //
    // For production, it should be 'https://bareefers.org/bc/uploads'
    //-------------------------------------------------------------------------

    get BC_UPLOADS_URL () { return get('BC_UPLOADS_URL'); },

    //-------------------------------------------------------------------------
    // This has to be provided to the server at RUNTIME. It is the local
    // directory where uploaded images will be stored.
    //
    // For development, on my machine, it is '/var/www/html/uploads' because
    // that's my web server's root directory for BC_UPLOADS_URL.
    //
    // For production, it should be '/home/admin3/bc-data/uploads'
    //-------------------------------------------------------------------------

    get BC_UPLOADS_DIR () { return get('BC_UPLOADS_DIR'); },

    //-------------------------------------------------------------------------
    // This has to be provided to the server at RUNTIME. It is the local
    // directory where the databases live.
    //
    // For development, it can be anywhere, such as /tmp
    //
    // For production, it should be '/home/admin3/bc-data/database'

    get BC_DATABASE_DIR () { return get('BC_DATABASE_DIR'); },
};

//-----------------------------------------------------------------------------

function get(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`MISSING ENVIRONMENT VARIABLE "${name}"`);
        process.exit(2);
    }
    console.warn(`${name}=${value}`);
    return value;
}
