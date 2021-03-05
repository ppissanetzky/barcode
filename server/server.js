
require('console-stamp')(console, {pattern: 'isoDateTime', metadata: process.pid});

const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');

//-----------------------------------------------------------------------------
// Configuration
//-----------------------------------------------------------------------------

const {
    BC_PRODUCTION,
    BC_SESSION_COOKIE_SECRETS,
    BC_SESSION_COOKIE_NAME,
    BC_SESSION_COOKIE_SECURE
} = require('./barcode.config');

//-----------------------------------------------------------------------------

const scheduler = require('./scheduler');

//-----------------------------------------------------------------------------

const {ExplicitError} = require('./errors');

const SessionStore = require('./session-store')(session);

//-----------------------------------------------------------------------------
// The routers
//-----------------------------------------------------------------------------

const publicRouter = require('./public-router');

const dbtcRouter = require('./dbtc-router');
const equipmentRouter = require('./equipment-router');
const userRouter = require('./user-router');
const adminRouter = require('./admin-router');
const marketRouter = require('./market-router');

//-----------------------------------------------------------------------------
// The XenForo stuff
//-----------------------------------------------------------------------------

const {validateXenForoUser, lookupUser} = require('./xenforo');

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

app.use(cookieParser(BC_SESSION_COOKIE_SECRETS.split(',')));

//-----------------------------------------------------------------------------
// To track sessions
// See:
// https://github.com/expressjs/session#options
// https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#secure-attribute
//-----------------------------------------------------------------------------

app.set('trust proxy', 1);

app.use(session({
    secret: BC_SESSION_COOKIE_SECRETS.split(','),
    name: BC_SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: true,
    secure: BC_SESSION_COOKIE_SECURE === 'production',
    resave: false,
    store: new SessionStore()
}));

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
        const {session} = req;
        let [user] = await validateXenForoUser(req.headers);
        // See if there is an impersonate user ID in the session
        const {impersonateUserId} = session;
        // We start out not impersonating
        let impersonating = false
        if (user.canImpersonate && impersonateUserId) {
            const impersonateUser = await lookupUser(impersonateUserId);
            if (impersonateUser) {
                req.originalUser = user
                user = impersonateUser;
                impersonating = true;
            }
        }
        // Set the user on the request
        req.user = user;
        // If there was an ID in the session, but we are no longer
        // impersonating, remove it from the session
        if (impersonateUserId && !impersonating) {
            delete session.impersonateUserId;
            return session.save(() => next());
        }
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

app.get('/impersonate', async (req, res) => {
    const {user, originalUser} = req;
    const name = user.name;
    const canImpersonate = originalUser ? originalUser.canImpersonate : user.canImpersonate;
    const impersonating = Boolean(originalUser);
    res.json({name, canImpersonate, impersonating});
});

app.put('/impersonate/:userId', async (req, res) => {
    const {session, user, originalUser, params: {userId}} = req;
    const canImpersonate = (originalUser || user).canImpersonate;
    const impersonating = Boolean(originalUser);
    if (!impersonating && canImpersonate) {
        const otherUser = await lookupUser(userId);
        if (otherUser) {
            session.impersonateUserId = otherUser.id;
            return session.save(() => res.json({}));
        }
    }
    res.json({});
});

app.delete('/impersonate', (req, res) => {
    const {session, originalUser} = req;
    const impersonating = Boolean(originalUser);
    if (impersonating) {
        delete session.impersonateUserId;
        delete req.originalUser;
        req.user = originalUser;
        return session.save(() => res.json());
    }
    res.json({});
});

//-----------------------------------------------------------------------------

app.use('/dbtc', dbtcRouter);
app.use('/equipment', equipmentRouter);
app.use('/user', userRouter);
app.use('/admin', adminRouter);
app.use('/market', marketRouter);

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
