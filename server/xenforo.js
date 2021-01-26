
const https = require('https');
const qs = require('querystring');
const cookieParser = require('cookie');

const {BC_TEST_USER, BC_XF_API_KEY, BC_PRODUCTION} = require('../barcode.config');
const dbtcDatabase = require('./dbtc-database');

const {AUTHENTICATION_FAILED, MEMBER_NEEDS_UPGRADE} = require('./errors');

//-----------------------------------------------------------------------------
// A user for testing
//-----------------------------------------------------------------------------

BC_TEST_USER && console.warn('Running as user', BC_TEST_USER);

//-----------------------------------------------------------------------------
// TEST USERS
//-----------------------------------------------------------------------------
// 16186 - barcode1
// 16188 - barcode2
// 16189 - barcode3
// 16190 - barcode4

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------

const API_KEY = BC_XF_API_KEY;
const HOST = 'bareefers.org';
const PATH = '/forum/api';
const SESSION_COOKIE = 'xfb_session';
const USER_COOKIE = 'xfb_user';

const LOGIN_LINK = 'https://bareefers.org/forum/login/';
const SUPPORTING_MEMBER_LINK = 'https://www.bareefers.org/forum/threads/how-do-i-become-a-supporting-member.14130/';
const NON_SUPPORTING_MEMBER_MESSAGE =
    'To use this app, you need to become a supporting member. Click the button below to learn how.';

// This is the user we impersonate when we need to - when creating alerts
// or conversations
const BARCODE_USER = 16211;

//-----------------------------------------------------------------------------
// XenForo custom groups
//-----------------------------------------------------------------------------
// BOD members are in group 3
// Supporting members are in group 5

const ALLOWED_GROUPS = new Set([3, 5]);

// Anyone that belongs to these groups can impersonate another user

const IMPERSONATE_GROUPS = new Set([3]);

//-----------------------------------------------------------------------------
// Utility function to make HTTPS requests
//-----------------------------------------------------------------------------

async function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
            let body = '';
            response.on('data', (chunk) => body += chunk);
            response.on('end', () => resolve([response, body]));
        });
        if (body) {
            request.write(body);
        }
        request.on('error', reject);
        request.end();
    });
}

//-----------------------------------------------------------------------------
// Utility function to make XenForo API requests
//-----------------------------------------------------------------------------

async function apiRequest(endpoint, method, params, headers) {
    let path = `${PATH}/${endpoint}`;
    if (method !== 'POST') {
        path += `?${qs.stringify(params)}`;
    }
    const options = {
        headers: {
            ...headers,
            'XF-Api-Key': API_KEY
        },
        hostname: HOST,
        path: path,
        method: method
    };
    let requestBody;
    if (method === 'POST') {
        requestBody = qs.stringify(params);
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = Buffer.byteLength(requestBody);
    }
    const [, body] = await httpsRequest(options, requestBody);
    //TESTING && console.log('API', endpoint, ':', options, requestBody, body);
    const result = JSON.parse(body);
    // If it has an error, throw
    if (result && (result.error || result.errors)) {
        throw new Error(`XF API response from "${endpoint}" has errors :\n${body}`);
    }
    return result;
}

//-----------------------------------------------------------------------------

function getUserGroups(xfUser) {
    const {user_group_id = -1, secondary_group_ids = []} = xfUser;
    return [user_group_id, ...secondary_group_ids];
}

function isXfUserAllowed(xfUser) {
    return getUserGroups(xfUser).some((id) => ALLOWED_GROUPS.has(id));
}

function canXfUserImpersonate(xfUser) {
    return getUserGroups(xfUser).some((id) => IMPERSONATE_GROUPS.has(id));
}

//-----------------------------------------------------------------------------
// Construct our own user object from a XenForo user
//-----------------------------------------------------------------------------

function makeUser(xfUser) {
    const {
        username,
        user_id,
        location,
        avatar_urls: {m},
        user_title,
        is_staff,
        register_date,
        view_url,
        age
    } = xfUser;
    return ({
        id: parseInt(user_id, 10),
        name: username,
        allowed: isXfUserAllowed(xfUser),
        canImpersonate: canXfUserImpersonate(xfUser),
        title: user_title,
        location: location,
        age: age,
        isStaff: is_staff,
        registerDate: register_date,
        viewUrl: view_url,
        avatarUrl: m
    });
}

//-----------------------------------------------------------------------------
// Validate the current user. Returns a user object if everything is OK
//-----------------------------------------------------------------------------


async function validateXenForoUser(headers) {

    function authenticationFailed(reason) {
        console.error('AUTHENTICATION FAILED :', reason, ':', headers);
        return AUTHENTICATION_FAILED(
            'You must be logged in. Please click the button below to go to the login page.',
            LOGIN_LINK,
            'Log in'
        );
    }

    // During development, use a test user
    if (BC_TEST_USER) {
        const user = await lookupUser(BC_TEST_USER);
        if (user) {
            return [user];
        }
    }

    // No cookies, no milk
    if (!headers.cookie) {
        throw authenticationFailed('No cookies at all');
    }

    // Parse the cookie header
    const cookies = cookieParser.parse(headers.cookie);

    // Get the session ID
    const sessionId = cookies[SESSION_COOKIE];
    const rememberCookie = cookies[USER_COOKIE];

    if (!sessionId && !rememberCookie) {
        throw authenticationFailed('No XF cookies');
    }

    // We do have at least one, so call XF to authenticate with them
    const response = await apiRequest('auth/from-session', 'POST', {
        session_id: sessionId,
        remember_cookie: rememberCookie,
    });

    // Now, validate the response
    const {success, user} = response || {};
    if (!success) {
        throw authenticationFailed('Auth request failed');
    }
    if (!user) {
        throw authenticationFailed('Auth response missing user');
    }

    // Get details about the user
    const {username, user_state} = user;

    // If the state is not 'valid', we don't like the user
    if (user_state !== 'valid') {
        throw authenticationFailed(`User ${username} has invalid state "${user_state}"`);
    }

    // See if the user is allowed to participate
    if (!isXfUserAllowed(user)) {
        throw MEMBER_NEEDS_UPGRADE(
            NON_SUPPORTING_MEMBER_MESSAGE,
            SUPPORTING_MEMBER_LINK,
            'Learn more'
        );
    }

    // Otherwise, the user is valid, so we return it along with cookies
    // to set (if any).
    return [cacheUser(makeUser(user)), null];
}

//-----------------------------------------------------------------------------
// This is a cache of users we keep around.
// TODO: clear items every so often - unbounded growth otherwise. We only
// have ~200 supporting members, so it shouldn't get out of hand.
//-----------------------------------------------------------------------------

const USER_CACHE = new Map();

// Add a user to the cache

function cacheUser(user, skipDatabase) {
    USER_CACHE.set(user.id, user);
    return user;
}

// Drop a user from the cache

function dropCachedUser(id) {
    USER_CACHE.delete(parseInt(id, 10));
}

// Get a user object from the cache given a user ID. Returns a user object
// or undefined if the user is not found or the request fails.

async function lookupUser(userId) {
    if (!userId) {
        console.error('Missing userId in lookup');
        return;
    }
    // Look for it in the cache and return the object if it exists
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
        console.error(`Invalid userId "${userId}"`);
        return;
    }
    const result = USER_CACHE.get(id);
    if (result) {
        console.log('Found user', id, 'in cache')
        return result;
    }
    // Otherwise, look the user up in XenForo
    try {
        const {user} = await apiRequest(`users/${id}/`, 'GET', {
            // Without this, we don't get information about the secondary
            // groups and we cannot determine whether the user is allowed
            api_bypass_permissions: 1
        });
        if (user && isXfUserAllowed(user)) {
            console.log('Found user', id, 'in forum');
            return cacheUser(makeUser(user));
        }
    }
    catch(error) {
        console.error(`Failed to lookup user ${id} :`, error);
    }
}

async function lookupUserWithFallback(userId) {
    const user = await lookupUser(userId);
    if (!user) {
        console.warn('Failed to look up user', )
    }
    return user || ({id: 0, name: '<unknown>'});
}

//-----------------------------------------------------------------------------
// users is an array of user IDs
// see: https://xenforo.com/community/pages/api-endpoints/#route_post_conversations_
//-----------------------------------------------------------------------------

async function startConversation(users, title, body) {
    const response = await apiRequest('conversations/', 'POST', {
        'recipient_ids[]': users,
        title: title,
        message: body,
        conversation_open: true,
        open_invite: true
    },
    {
        'XF-Api-User': BARCODE_USER
    });
    if (!(response && response.success)) {
        throw new Error('XF API failed to start conversation');
    }
}

//-----------------------------------------------------------------------------
// Send an alert to the given user ID. Alerts cannot include BBcode but may
// have a single link which is {link} in the body
// see: https://xenforo.com/community/pages/api-endpoints/#route_post_alerts_
//-----------------------------------------------------------------------------

async function sendAlert(recipientId, body, linkText, linkUrl) {
    const response = await apiRequest('alerts/', 'POST', {
        to_user_id: recipientId,
        alert: body,
        link_url: linkUrl,
        link_title: linkText
    },
    {
        'XF-Api-User': BARCODE_USER
    });
    if (!(response && response.success)) {
        throw new Error('XF API failed to send an alert');
    }
}

//-----------------------------------------------------------------------------
// This API returns all users that are allowed to use the system with names
// matching the given prefix.
// It also caches them
// https://xenforo.com/community/pages/api-endpoints/#route_get_users_find_name
//-----------------------------------------------------------------------------

async function findUsersWithPrefix(prefix) {
    const response = await apiRequest('users/find-name', 'GET', {
        username: prefix,
        // Without this, we don't get information about the secondary
        // groups and we cannot determine whether the user is allowed
        api_bypass_permissions: 1
    });
    const users = [];
    if (response) {
        const {exact, recommendations} = response;
        if (exact && isXfUserAllowed(exact)) {
            users.push(cacheUser(makeUser(exact)));
        }
        recommendations.forEach((xfUser) => {
            if (isXfUserAllowed(xfUser)) {
                users.push(cacheUser(makeUser(xfUser)));
            }
        });
    }
    return users;
}

//-----------------------------------------------------------------------------

async function getThreadsForItemType(userId, type) {
    const {forumId} = dbtcDatabase.getType(type) || {};
    if (!forumId) {
        return [];
    }
    const {pagination, threads = []} = await apiRequest(`forums/${forumId}`, 'GET', {
        with_threads: true,
        page: 1,
        starter_id: userId
    });
    return threads.map(({thread_id, title}) => ({
        threadId: thread_id,
        title
    }));
}

//-----------------------------------------------------------------------------

module.exports = {
    validateXenForoUser,
    lookupUser,
    lookupUserWithFallback,
    startConversation,
    sendAlert,
    findUsersWithPrefix,
    getThreadsForItemType,
};

// (async function() {
//     const response = await getThreadsForItemType(803, 'LPS');
//     console.log(response);
// })();

/* ALERT EXAMPLE

(async function() {
    const response = await apiRequest('alerts/', 'POST', {
        to_user_id: 15211,
        alert: 'This is an alert. Please go {link}. Talk to [USER="16188"]@barcode2[/USER]',
        from_user_id: 0,
        link_url: 'https://bareefers.org/barcode/equipment',
        link_title: 'here'
    }, {
        'XF-Api-User': 16186
    });
    console.log(response);
})();
*/
