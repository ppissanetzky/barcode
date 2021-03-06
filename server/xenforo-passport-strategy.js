
const _ = require('lodash');

const Strategy = require('passport-strategy');
const debug = require('debug')('barcode:xenforo-passport');

//-----------------------------------------------------------------------------

const {BC_TEST_USER} = require('./barcode.config');
const XenForo = require('./xenforo');

//-----------------------------------------------------------------------------
// These were the existing cookies before I changed the
// prefix on 2/11/2021 to support subdomains
//-----------------------------------------------------------------------------

const OLD_SESSION_COOKIE = 'xfb_session';
const OLD_USER_COOKIE    = 'xfb_user';

//-----------------------------------------------------------------------------
// These are the new ones
//-----------------------------------------------------------------------------

const NEW_SESSION_COOKIE = 'xfc_session';
const NEW_USER_COOKIE    = 'xfc_user';

//-----------------------------------------------------------------------------

class Unauthenticated extends Error {};
class Forbidden extends Error {};

//-----------------------------------------------------------------------------

class XenForoPassportStrategy extends Strategy {
    constructor() {
        super();
        this.name = 'XenForo';
    }

    async authenticate(req, options) {
        try {
            const {user} = req;

            // For a test user, we look up every time, disregarding
            // the user that may be in the session

            if (BC_TEST_USER) {
                const id = parseInt(BC_TEST_USER, 10);
                if (id && _.isSafeInteger(id)) {
                    const testUser = await XenForo.lookupUser(id);
                    if (!testUser) {
                        throw new Error('Failed to lookup test user');
                    }
                    debug(`Test user ${testUser.name}:${testUser.id}`);
                    return this.success(testUser);
                }
            }

            // Otherwise, if there is already a user, pass
            if (user) {
                debug(`Already have ${user.name}:${user.id}`);
                return this.pass();
            }

            // Get the XenForo cookies
            const cookies = req.cookies;
            const sessionId = cookies[NEW_SESSION_COOKIE] ||
                cookies[OLD_SESSION_COOKIE];
            const rememberCookie = cookies[NEW_USER_COOKIE] ||
                cookies[OLD_USER_COOKIE];

            // If we have neither, we fail with a 401
            if (!sessionId && !rememberCookie) {
                throw new Unauthenticated('No cookies');
            }

            // We do have at least one, so call XF to authenticate with them
            const response = await XenForo.apiRequest('auth/from-session', 'POST', {
                session_id: sessionId,
                remember_cookie: rememberCookie,
            });

            // Validate the response
            const {success, user: xfUser} = response || {};
            if (!success) {
                throw new Error('Auth response is not success');
            }
            if (!xfUser) {
                throw new Error('Auth response did not have a user');
            }

            // Get details about the user
            const {username, user_state} = xfUser;

            // If the state is not 'valid', we don't like the user
            if (user_state !== 'valid') {
                throw new Forbidden(`User ${username} has invalid state "${user_state}"`);
            }

            // Make a user object
            const authenticatedUser = XenForo.makeUser(xfUser);

            // If the user is not allowed, we fail
            if (!authenticatedUser.allowed) {
                throw new Forbidden('Not a supporting member');
            }

            // OK, all is well
            debug(`Authenticated with cookies ${authenticatedUser.name}:${authenticatedUser.id}`);
            this.success(authenticatedUser);
        }
        catch (error) {
            console.error('XenForo authentication problem :', error, req.headers);
            // Unauthenticated means a 401 - they need to log in to the forum
            if (error instanceof Unauthenticated) {
                return this.fail(undefined, 401);
            }
            // Forbidden means that we know who they are but they
            // are not allowed. Non-supporting members or invalid
            // users
            if (error instanceof Forbidden) {
                return this.fail(undefined, 403);
            }
            // Otherwise, it is a true error
            this.error(error);
        }
    }
}

module.exports = XenForoPassportStrategy;
