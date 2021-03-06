
require('console-stamp')(console, {pattern: 'isoDateTime', metadata: process.pid});

const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

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

//-----------------------------------------------------------------------------
// This thing saves sessions to the users database. It is used by
// express-session
//-----------------------------------------------------------------------------

const SessionStore = require('./session-store')(session);

//-----------------------------------------------------------------------------
// This is a Passport strategy to sign in to the forum using XenForo's cookies
//-----------------------------------------------------------------------------

const XenForoPassportStrategy = require('./xenforo-passport-strategy');

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

const {lookupUser} = require('./xenforo');

//-----------------------------------------------------------------------------
// Create the express app
//-----------------------------------------------------------------------------

const app = express();

//-----------------------------------------------------------------------------
// Disable e-tag since it interfers with our headers
//-----------------------------------------------------------------------------

app.set('etag', false);

//-----------------------------------------------------------------------------
// Trust the proxy
//-----------------------------------------------------------------------------

app.set('trust proxy', 1);

//-----------------------------------------------------------------------------
// Disable this response header, so we don't reveal too much
//-----------------------------------------------------------------------------

app.set('x-powered-by', false);

//-----------------------------------------------------------------------------
// These come from an environment variable that is comma-separated
//-----------------------------------------------------------------------------

const COOKIE_SECRETS = BC_SESSION_COOKIE_SECRETS.split(',');

//-----------------------------------------------------------------------------
// To parse cookies.
//-----------------------------------------------------------------------------

app.use(cookieParser(COOKIE_SECRETS));

//-----------------------------------------------------------------------------
// To parse application/x-www-form-urlencoded in posts
//-----------------------------------------------------------------------------

app.use(express.urlencoded({extended: true}));

//-----------------------------------------------------------------------------
// To track sessions
// See:
// https://github.com/expressjs/session#options
// https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#secure-attribute
//-----------------------------------------------------------------------------

app.use(session({
    secret: COOKIE_SECRETS,
    name: BC_SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: true,
    secure: BC_SESSION_COOKIE_SECURE === 'production',
    resave: false,
    saveUninitialized: false,
    store: new SessionStore()
}));

//-----------------------------------------------------------------------------
// Passport
//-----------------------------------------------------------------------------

app.use(passport.initialize());
app.use(passport.session());

//-----------------------------------------------------------------------------
// This is used to convert a 'user' object to its representation in the
// session store. We could store just the ID and then look it up but, for now,
// We're putting the entire object in the session.
//-----------------------------------------------------------------------------

passport.serializeUser((user, done) => done(null, user));

//-----------------------------------------------------------------------------
// This one takes whatever we put in the session and converts it to a 'user'
// object that is attached to each request.

passport.deserializeUser((user, done) => done(null, user));

//-----------------------------------------------------------------------------
// Add our forum login strategy to passport
//-----------------------------------------------------------------------------

passport.use(new XenForoPassportStrategy());

//-----------------------------------------------------------------------------
// CAREFUL - THESE ROUTES DO NOT GET USER VALIDATION. THEY ARE PUBLIC
//-----------------------------------------------------------------------------

app.use('/public', publicRouter);

//-----------------------------------------------------------------------------
// Now, we use the passport authentication strategy to get a user
// object. This protects all the routes below - they will have a 'user' object
// in 'req'. If it fails, it will return a 401.
//-----------------------------------------------------------------------------

app.use(passport.authenticate('XenForo'));

//-----------------------------------------------------------------------------
// This one implements impersonation
//-----------------------------------------------------------------------------

app.use(async (req, res, next) => {
    const {session, user} = req;
    // See if there is an impersonate user ID in the session
    const {impersonateUserId} = session;
    // We start out not impersonating
    let impersonating = false
    if (user.canImpersonate && impersonateUserId) {
        const impersonateUser = await lookupUser(impersonateUserId);
        if (impersonateUser) {
            req.originalUser = user
            req.user = impersonateUser;
            impersonating = true;
        }
    }
    // If there was an ID in the session, but we are no longer
    // impersonating, remove it from the session, save it and continue
    if (impersonateUserId && !impersonating) {
        delete session.impersonateUserId;
        return session.save(() => next());
    }
    // Carry on
    next();
});

//-----------------------------------------------------------------------------
// Just for debugging purposes
//-----------------------------------------------------------------------------

if (!BC_PRODUCTION) {
    app.use((req, res, next) => {
        const {originalUser, user} = req;
        const prefix = originalUser ? `${originalUser.name}:${originalUser.id} as ` : '';
        console.log(`(${prefix}${user.name}:${user.id}) :`, req.method, req.url);
        next();
    });
}

//-----------------------------------------------------------------------------
// These deal with impersonation.
//  get - returns the current state
//  put - starts impersonating
//  delete - stops impersonating
//-----------------------------------------------------------------------------

app.get('/impersonate', (req, res) => {
    const {user, originalUser} = req;
    const name = user.name;
    const canImpersonate = originalUser ? false : user.canImpersonate;
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
    res.status(200).end();
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
    res.status(200).end();
});

//-----------------------------------------------------------------------------
// Now, the routes
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
