
const https = require('https');
const qs = require('querystring');
const cookieParser = require('cookie');

//-----------------------------------------------------------------------------
// A constant for conditional behavior while testing
//-----------------------------------------------------------------------------

const TESTING = process.env.NODE_ENV !== 'production';

// If testing and the first argument is present, use it as a test user

const TEST_USER = TESTING && process.argv[2];

TEST_USER && console.warn('Running as user', TEST_USER);

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

const API_KEY = 'ALMLGH6saPr2IzSjl3WGE70UkaocN_9K';
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

function isXfUserAllowed(xfUser) {
    // This should be an array of group IDs (numbers). Check to make sure
    // the user is in one of the groups allowed to participate.
    const {secondary_group_ids = []} = xfUser;
    return secondary_group_ids.some((id) => ALLOWED_GROUPS.has(id));
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
        last_activity,
        is_staff,
        register_date,
        view_url,
        age
    } = xfUser;
    return ({
        id: parseInt(user_id, 10),
        name: username,
        allowed: isXfUserAllowed(xfUser),
        title: user_title,
        location: location,
        age: age,
        isStaff: is_staff,
        registerDate: register_date,
        lastActivityDate: last_activity,
        viewUrl: view_url,
        avatarUrl: m
    });
}

//-----------------------------------------------------------------------------
// Custom error to signal that although this user is valid, they are not
// allowed to use the system because they need an upgrade. The error message
// and link to upgrade will be shown to the user.
//
// In the BAR specific case, this happens when they are not a supporting
// member.
//
//-----------------------------------------------------------------------------

class MemberNotAllowedError extends Error {
    constructor(message) {
        super(message);
        this.link = SUPPORTING_MEMBER_LINK;
    }
};

//-----------------------------------------------------------------------------
// Validate the current user. Returns a user object if everything is OK
//-----------------------------------------------------------------------------

async function validateXenForoUser(headers) {
    // During development, use a test user
    if (TEST_USER) {
        const user = await lookupUser(TEST_USER);
        if (user) {
            return [user];
        }
    }

    // No cookies, no milk
    if (!headers.cookie) {
        throw new Error('Missing cookies');
    }

    // Parse the cookie header
    const cookies = cookieParser.parse(headers.cookie);

    // Get the session ID
    const sessionId = cookies[SESSION_COOKIE];
    const rememberCookie = cookies[USER_COOKIE];

    if (!sessionId && !rememberCookie) {
        throw new Error('No XF cookies at all, must login');
    }

    // We do have at least one, so call XF to authenticate with them
    const response = await apiRequest('auth/from-session', 'POST', {
        session_id: sessionId,
        remember_cookie: rememberCookie,
    });

    // Now, validate the response
    const {success, user} = response || {};
    if (!success) {
        throw new Error('Auth request failed');
    }
    if (!user) {
        throw new Error('Auth response missing user');
    }

    // Get details about the user
    const {username, user_state} = user;

    // If the state is not 'valid', we don't like the user
    if (user_state !== 'valid') {
        throw new Error(`User ${username} has invalid state "${user_state}"`);
    }

    // See if the user is allowed to participate
    if (!isXfUserAllowed(user)) {
        throw new MemberNotAllowedError(NON_SUPPORTING_MEMBER_MESSAGE);
    }

    // Otherwise, the user is valid, so we return it along with cookies
    // to set (if any)
    return [cacheUser(makeUser(user)), null];
}

//-----------------------------------------------------------------------------
// This is a cache of users we keep around.
// TODO: clear items every so often - unbounded growth otherwise
//-----------------------------------------------------------------------------

const USER_CACHE = new Map();

// Add a user to the cache and return a user object

function cacheUser(user) {
    USER_CACHE.set(user.id, user);
    return user;
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
        return result;
    }
    // Otherwise, look the user up in XenForo
    try {
        const {user} = await apiRequest(`users/${id}/`, 'GET');
        if (user) {
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
// This API returns all users with names matching the given prefix.
// NOTE: It returns partial users. Most notably, the groups are missing,
// so we can't tell whether they are allowed to use the system.
// We'll have to validate them later.
// https://xenforo.com/community/pages/api-endpoints/#route_get_users_find_name
//-----------------------------------------------------------------------------

async function findUsersWithPrefix(prefix) {
    const response = await apiRequest('users/find-name', 'GET', {
        username: prefix
    });
    const users = [];
    if (response) {
        const {exact, recommendations} = response;
        if (exact) {
            users.push(makeUser(exact));
        }
        recommendations.forEach((xfUser) => {
            users.push(makeUser(xfUser));
        });
    }
    return users;
}

//-----------------------------------------------------------------------------

module.exports = {
    validateXenForoUser,
    lookupUser,
    lookupUserWithFallback,
    LOGIN_LINK,
    MemberNotAllowedError,
    startConversation,
    sendAlert,
    findUsersWithPrefix
};

/*
(async function() {
    const result = await startConversation([15211, 16186, 16188], 'It is time to return the PAR meter',
    'Just wanted to let you know that you should return it soon.\n[url=https://bareefers.org/barcode/equipment/1]Click here to return it[/url]');
    console.log(result);
})();
*/

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
/*
(async function() {
    // barcode = 16186
    const environmentUserId = process.env.XF_USER;
    if (!environmentUserId) {
        return;
    }
    console.warn('Using XF user', environmentUserId);
    const loginTokenResponse = await apiRequest('auth/login-token', 'POST', {user_id: environmentUserId});
    const {login_url} = loginTokenResponse;
    const [{headers}] = await httpsRequest(login_url);
    const cookie = headers['set-cookie'].map((item) => item.split(' ')[0]).join(' ');
    const user = await apiRequest(`users/${environmentUserId}`, 'GET', {}, {Cookie: cookie});
    console.log(user);
})();
*/
/*
apiRequest('auth/login-token', 'POST', {user_id: }).then((response) => {
    console.log(response);
    const {login_url} = response;

    return new Promise((resolve, reject) => {
        const request = https.request(login_url, (response) => {
            console.log(JSON.stringify(response.headers));
            let body = '';
            response.on('data', (chunk) => body += chunk);
            response.on('end', () => resolve(body));
        });
        request.on('error', reject);
        request.end();
    });
});
*/
