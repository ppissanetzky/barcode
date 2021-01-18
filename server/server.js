const express = require('express');

//-----------------------------------------------------------------------------
// Configuration
//-----------------------------------------------------------------------------

const {BC_PRODUCTION} = require('../barcode.config');

//-----------------------------------------------------------------------------

const {ExplicitError} = require('./errors');

//-----------------------------------------------------------------------------
// The routes (URLs) for DBTC
//-----------------------------------------------------------------------------

const dbtcRouter = require('./dbtc-router');

//-----------------------------------------------------------------------------
// The XenForo stuff
//-----------------------------------------------------------------------------

const {validateXenForoUser} = require('./xenforo');

//-----------------------------------------------------------------------------
// Create the express app
//-----------------------------------------------------------------------------

const app = express();

//-----------------------------------------------------------------------------
// To parse application/x-www-form-urlencoded in posts
//-----------------------------------------------------------------------------

app.use(express.urlencoded({extended: true}));

//-----------------------------------------------------------------------------
// This function has to validate the incoming request's session against
// XenForo and augment the request with 'user'. If it cannot do that, it
// should fail - preventing access to the application if there is no user.
//-----------------------------------------------------------------------------
// THIS CALL MUST BE BEFORE ALL ROUTES
//-----------------------------------------------------------------------------

app.use((req, res, next) => {
    Promise.resolve().then(async () => {
        try {
            const [user, setCookies] = await validateXenForoUser(req.headers);
            req.user = user;
            // If cookies came back, set them on the response
            if (setCookies) {
                setCookies.forEach((cookie) => res.cookie(cookie));
            }
            next();
        }
        catch(error) {
            next(error);
        }
    })
    .catch(next);
});

//-----------------------------------------------------------------------------
// Just for debugging purposes
//-----------------------------------------------------------------------------

if (!BC_PRODUCTION) {
    app.use((req, res, next) => {
        console.log(`(${req.user.name}:${req.user.id}) :`, req.url);
        next();
    });
}

//-----------------------------------------------------------------------------
// The dbtc routes
//-----------------------------------------------------------------------------

app.use('/bc/api/dbtc', dbtcRouter);

//-----------------------------------------------------------------------------

app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error)
    }
    console.error(req.originalUrl, error);
    // Always a 500
    res.status(500);
    // If it is one of our application errors, put the error JSON in the
    // response body
    if (error instanceof ExplicitError) {
        res.json(error.asJSON());
    }
    // End it
    res.end();
});

//-----------------------------------------------------------------------------
// The port that the Express application listens to.
//-----------------------------------------------------------------------------

const PORT = 3003;

//-----------------------------------------------------------------------------
// Start listening
//-----------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`BARcode ready at http://localhost:${PORT}`);
});
