
require('console-stamp')(console, {pattern: 'isoDateTime', metadata: process.pid});

const express = require('express');
const cookieParser = require('cookie-parser');

//-----------------------------------------------------------------------------
// Configuration
//-----------------------------------------------------------------------------

const {BC_PRODUCTION} = require('./barcode.config');

//-----------------------------------------------------------------------------

const scheduler = require('./scheduler');

//-----------------------------------------------------------------------------

const {ExplicitError} = require('./errors');

//-----------------------------------------------------------------------------
// The routes (URLs) for DBTC
//-----------------------------------------------------------------------------

const dbtcRouter = require('./dbtc-router');

//-----------------------------------------------------------------------------
// The routes (URLs) for equipment
//-----------------------------------------------------------------------------

const equipmentRouter = require('./equipment-router');

//-----------------------------------------------------------------------------
// The routes (URLs) for user
//-----------------------------------------------------------------------------

const userRouter = require('./user-router');

//-----------------------------------------------------------------------------
// The public routes
//-----------------------------------------------------------------------------

const publicRouter = require('./public-router');

//-----------------------------------------------------------------------------
// The XenForo stuff
//-----------------------------------------------------------------------------

const {validateXenForoUser, lookupUser} = require('./xenforo');

//-----------------------------------------------------------------------------
// The name of the impersonate cookie
//-----------------------------------------------------------------------------

const IMPERSONATE_COOKIE = 'bc-imp';

//-----------------------------------------------------------------------------
// Create the express app
//-----------------------------------------------------------------------------

const app = express();

//-----------------------------------------------------------------------------
// Disable e-tag since it interfers with our headers
//-----------------------------------------------------------------------------

app.set('etag', false);

//-----------------------------------------------------------------------------
// To parse cookies
//-----------------------------------------------------------------------------

app.use(cookieParser());

//-----------------------------------------------------------------------------
// To parse application/x-www-form-urlencoded in posts
//-----------------------------------------------------------------------------

app.use(express.urlencoded({extended: true}));

//-----------------------------------------------------------------------------
// CAREFUL - THESE ROUTES DO NOT GET USER VALIDATION. THEY ARE PUBLIC
//-----------------------------------------------------------------------------

app.use('/public', publicRouter);

//-----------------------------------------------------------------------------
// This function has to validate the incoming request's session against
// XenForo and augment the request with 'user'. If it cannot do that, it
// should fail - preventing access to the application if there is no user.
//-----------------------------------------------------------------------------
// THIS CALL MUST BE BEFORE ALL ROUTES
//-----------------------------------------------------------------------------

app.use((req, res, next) => {
    Promise.resolve().then(async () => {
        let [user] = await validateXenForoUser(req.headers);
        // See if there is an impersonate cookie
        const impersonateUserId = parseInt(req.cookies[IMPERSONATE_COOKIE], 10);
        // We start out not impersonating
        let impersonating = false
        if (user.canImpersonate) {
            res.setHeader('bc-can-impersonate', true);
            if (impersonateUserId) {
                const impersonateUser = await lookupUser(impersonateUserId);
                if (impersonateUser) {
                    req.originalUser = user;
                    user = impersonateUser;
                    impersonating = true;
                    res.setHeader('bc-impersonating', user.id);
                }
            }
        }
        if (impersonateUserId && !impersonating) {
            res.cookie(IMPERSONATE_COOKIE, 0);
        }
        // Set the user on the request
        req.user = user;
        // Reply with the user's name in a response header
        res.setHeader('bc-user', user.name);
        // Done
        next();
    })
    .catch(next);
});

//-----------------------------------------------------------------------------
// Just for debugging purposes
//-----------------------------------------------------------------------------

if (!BC_PRODUCTION) {
    app.use((req, res, next) => {
        console.log(`(${req.user.name}:${req.user.id}) :`, req.method, req.url);
        next();
    });
}

//-----------------------------------------------------------------------------

app.put('/impersonate/:userId', async (req, res) => {
    const {user, params} = req;
    const {userId} = params;
    if (user.canImpersonate) {
        const otherUser = await lookupUser(userId);
        if (otherUser) {
            res.cookie(IMPERSONATE_COOKIE, otherUser.id);
            res.setHeader('bc-user', otherUser.name);
            res.setHeader('bc-impersonating', otherUser.id);
        }
    }
    res.json({});
});

//-----------------------------------------------------------------------------

app.delete('/impersonate', (req, res) => {
    const {originalUser} = req;
    res.cookie(IMPERSONATE_COOKIE, 0);
    if (originalUser) {
        res.setHeader('bc-user', originalUser.name);
    }
    else {
        console.error('No original user for', req.headers);
    }
    res.setHeader('bc-impersonating', 0);
    res.json({});
});

//-----------------------------------------------------------------------------
// The dbtc routes
//-----------------------------------------------------------------------------

app.use('/dbtc', dbtcRouter);

//-----------------------------------------------------------------------------
// The equipment routes
//-----------------------------------------------------------------------------

app.use('/equipment', equipmentRouter);

//-----------------------------------------------------------------------------
// The user routes
//-----------------------------------------------------------------------------

app.use('/user', userRouter);

//-----------------------------------------------------------------------------

app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error)
    }
    // Always a 500
    res.status(500);
    // If it is one of our application errors, put the error JSON in the
    // response body
    if (error instanceof ExplicitError) {
        console.error(req.user, req.originalUrl, error.code);
        res.json(error.asJSON());
    }
    else {
        console.error(req.user, req.originalUrl, error);
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

const server = app.listen(PORT, () => {
    console.log(`BARcode ready at http://localhost:${PORT}`);
    // Start the scheduler
    scheduler();
});

//-----------------------------------------------------------------------------
// Graceful shutdown for docker
//-----------------------------------------------------------------------------

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
