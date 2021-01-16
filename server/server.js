const express = require('express');

const {BC_PRODUCTION} = require('../barcode.config');

//-----------------------------------------------------------------------------
// The routes (URLs) for DBTC
//-----------------------------------------------------------------------------

const dbtcRouter = require('./dbtc-router');

//-----------------------------------------------------------------------------
// The XenForo stuff
//-----------------------------------------------------------------------------

const {
    validateXenForoUser,
    LOGIN_LINK,
    MemberNotAllowedError
} = require('./xenforo');

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
            if (error instanceof MemberNotAllowedError) {
                res.json({
                    error: ERROR_CODES.MEMBER_NEEDS_UPGRADE,
                    message: error.message,
                    link: error.link,
                    button: 'Learn more'
                });
            }
            else {
                console.error('Failed to validate user :', error);
                console.error(JSON.stringify(req.headers));
                res.json({
                    error: ERROR_CODES.AUTHENTICATION_FAILED,
                    message: 'You must be logged in. Please click the button below to go to the login page.',
                    link: LOGIN_LINK,
                    button: 'Log in'
                });
            }
        }
    });
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
// The port that the Express application listens to.
//-----------------------------------------------------------------------------

const PORT = 3003;

//-----------------------------------------------------------------------------
// Start listening
//-----------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`BARcode ready at http://localhost:${PORT}`);
});
