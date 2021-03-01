
const https = require('https');
const qs = require('querystring');
const cookieParser = require('cookie');
const _ = require('lodash');

// https://github.com/JiLiZART/bbob/tree/master/packages/bbob-core
const bbob = require('@bbob/core').default;

const {BC_TEST_USER, BC_XF_API_KEY} = require('./barcode.config');
const dbtcDatabase = require('./dbtc-database');

const {AUTHENTICATION_FAILED, MEMBER_NEEDS_UPGRADE} = require('./errors');

const {utcIsoStringFromDate, utcIsoStringFromUnixTime, age} = require('./dates');

const {isGoodId} = require('./utility');

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

const LOGIN_LINK = 'https://bareefers.org/forum/login/';
const SUPPORTING_MEMBER_LINK = 'https://www.bareefers.org/forum/threads/how-do-i-become-a-supporting-member.14130/';
const NON_SUPPORTING_MEMBER_MESSAGE =
    'To use this app, you need to become a supporting member. Click the button below to learn how.';

//-----------------------------------------------------------------------------
// This is the user we impersonate when we need to - when creating alerts
// or conversations
//-----------------------------------------------------------------------------

const BARCODE_USER = 16211;

//-----------------------------------------------------------------------------
// A custom thread prefix for all threads started by BARcode
//-----------------------------------------------------------------------------

const BARCODE_PREFIX = 3;

//-----------------------------------------------------------------------------
// XenForo custom groups
//-----------------------------------------------------------------------------
// BOD members are in group 3
// Supporting members are in group 5

const ALLOWED_GROUPS = new Set([3, 5]);

// Anyone that belongs to these groups can impersonate another user

const IMPERSONATE_GROUPS = new Set([3]);

// Anyone that belongs to these groups can hold equipment indefinitely

const EQUIPMENT_GROUPS = new Set([3]);

// Tank journals forum ID

const TANK_JOURNALS_FORUM_ID = 22;

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

function canXfUserHoldEquipment(xfUser) {
    return getUserGroups(xfUser).some((id) => EQUIPMENT_GROUPS.has(id));
}

//-----------------------------------------------------------------------------
// Construct our own user object from a XenForo user
//-----------------------------------------------------------------------------

function makeUser(xfUser) {
    const {
        username,
        user_id,
        location,
        avatar_urls: {h},
        user_title,
        is_staff,
        register_date,
        last_activity,
        view_url,
        age,
        message_count
    } = xfUser;
    const allowed = isXfUserAllowed(xfUser);
    let lastActivity
    try {
        lastActivity = utcIsoStringFromUnixTime(last_activity);
    }
    catch (error) {
        console.error('Failed to convert last activity', last_activity);
    }
    return ({
        id: parseInt(user_id, 10),
        name: allowed ? username : username + ' (NSM)',
        allowed,
        canImpersonate: canXfUserImpersonate(xfUser),
        canHoldEquipment: canXfUserHoldEquipment(xfUser),
        isAdmin: canXfUserImpersonate(xfUser),
        title: user_title,
        location: location,
        age: age,
        isStaff: is_staff,
        registerDate: utcIsoStringFromUnixTime(register_date),
        lastActivity,
        viewUrl: view_url,
        avatarUrl: h,
        messageCount: message_count
    });
}

//-----------------------------------------------------------------------------
// Validate the current user. Returns a user object if everything is OK
//-----------------------------------------------------------------------------


async function validateXenForoUser(headers) {

    function authenticationFailed(reason) {
        console.error('AUTHENTICATION FAILED :', reason, ':', headers);
        const loginLink = `${LOGIN_LINK}?_xfRedirect=https://bareefers.org/redirect.php?to=${headers.referer}`;
        return AUTHENTICATION_FAILED(
            'You must be logged in. Please click the button below to go to the login page.',
            loginLink,
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
    const sessionId = cookies[NEW_SESSION_COOKIE] || cookies[OLD_SESSION_COOKIE];
    const rememberCookie = cookies[NEW_USER_COOKIE] || cookies[OLD_USER_COOKIE];

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
// or undefined if the user is not found or the request fails. If the user
// is not allowed to use the system, it returns undefined unless
// 'forDisplayOnly' is set to true, in which case, the user is returned
// regardless

async function lookupUser(userId, forDisplayOnly) {
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
        const {user} = await apiRequest(`users/${id}/`, 'GET', {
            // Without this, we don't get information about the secondary
            // groups and we cannot determine whether the user is allowed
            api_bypass_permissions: 1
        });
        const isAllowed = isXfUserAllowed(user);
        if (!isAllowed) {
            console.log('USER NOT ALLOWED',
                user.username,
                user.user_title,
                user.user_state,
                user.user_group_id,
                user.secondary_group_ids);
        }
        if (user && (forDisplayOnly || isAllowed)) {
            return cacheUser(makeUser(user));
        }
    }
    catch(error) {
        console.error(`Failed to lookup user ${id} :`, error);
    }
}

async function getUserEmailAddress(userId) {
    const {user} = await apiRequest(`users/${userId}/`, 'GET', {
        // Without this, we don't get information about the secondary
        // groups and we cannot determine whether the user is allowed
        api_bypass_permissions: 1
    });
    return user.email;
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

async function startConversation(users, title, body, closed) {
    const response = await apiRequest('conversations/', 'POST', {
        'recipient_ids[]': users,
        title: title,
        message: body,
        conversation_open: closed ? 0 : 1,
        open_invite: closed ? 0 : 1
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

async function findUsersWithPrefix(prefix, all) {
    const response = await apiRequest('users/find-name', 'GET', {
        username: prefix,
        // Without this, we don't get information about the secondary
        // groups and we cannot determine whether the user is allowed
        api_bypass_permissions: 1
    });
    const users = [];
    if (response) {
        const {exact, recommendations} = response;
        if (exact && (all || isXfUserAllowed(exact))) {
            users.push(cacheUser(makeUser(exact)));
        }
        recommendations.forEach((xfUser) => {
            if (all || isXfUserAllowed(xfUser)) {
                users.push(cacheUser(makeUser(xfUser)));
            }
        });
    }
    return users;
}

//-----------------------------------------------------------------------------
// Converts a XenForo thread to our format, augmenting it
//-----------------------------------------------------------------------------

function convertThread(thread) {
    const startDate = utcIsoStringFromDate(new Date(thread.post_date * 1000));
    const lastPostDate = utcIsoStringFromDate(new Date(thread.last_post_date * 1000));
    return ({
        startDate,
        lastPostDate,
        sortKey:        thread.last_post_date,
        threadId:       thread.thread_id,
        startAge:       age(startDate, 'today', 'ago'),
        lastPostAge:    age(lastPostDate, 'today', 'ago'),
        title:          thread.title,
        name:           nameFromThreadTitle(thread.title),
        viewUrl:        thread.view_url
    })
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
    return threads.map((thread) => convertThread(thread));
}

//-----------------------------------------------------------------------------
// Removes the 'DBTC' part and all leading non-alphanumeric characters. Then
// trims white space on both ends.
//-----------------------------------------------------------------------------

function nameFromThreadTitle(title) {
    return title.replace('DBTC', '').replace(/^\W*/, '').trim();
}

//-----------------------------------------------------------------------------
// Gets one page of DBTC threads per 'type' for the given user. Sorts them
// so that the threads with the most recent post are at the top
//-----------------------------------------------------------------------------

async function getDBTCThreadsForUser(userId) {
    const types = dbtcDatabase.getTypes();
    const result = [];
    await Promise.all(types.map(async ({type, forumId}) => {
        const {threads} = await apiRequest(`forums/${forumId}`, 'GET', {
            with_threads: true,
            page: 1,
            starter_id: userId
        });
        threads.forEach((thread) => {
            result.push({
                type,
                ...convertThread(thread)
            });
        });
    }));
    return result.sort((a, b) => b.sortKey - a.sortKey);
}

async function getTankJournalsForUser(userId) {
    const {threads} = await apiRequest(`forums/${TANK_JOURNALS_FORUM_ID}`, 'GET', {
        with_threads: 1,
        page: 1,
        starter_id: userId
    });
    return threads ? threads.map(({title, view_url}) => ({title, url: view_url})) : [];
}

//-----------------------------------------------------------------------------
// Make sure the thread belongs to the given user.
//-----------------------------------------------------------------------------

async function validateUserThread(userId, threadId) {
    if (isGoodId(threadId)) {
        const {thread} = await apiRequest(`threads/${threadId}/`, 'GET');
        if (thread && thread.user_id === userId) {
            return convertThread(thread);
        }
    }
}

//-----------------------------------------------------------------------------
// This function takes a XenForo post body, which uses BB code and removes
// quotes altogether. It finds mentions of users and replaces all other BB code
// tags with just the tag. It creates a more readable message for our purposes
//-----------------------------------------------------------------------------

function redactBBCode(userId, message) {
    let mentions = [];
    let images = [];
    const text = [];
    bbob().process(message).tree.walk((thing) => {
        if (typeof thing === 'object') {
            if (thing.tag === 'user') {
                mentions.push({
                    id: parseInt(Object.keys(thing.attrs)[0], 10),
                    name: thing.content.join('').substr(1)
                });
                text.push(thing.content.join(''));
            }
            else if (thing.tag === 'img') {
                (thing.content || []).forEach((item) => {
                    if (_.isString(item)) {
                        images.push(item);
                    }
                });
                text.push(`[${thing.tag}]`);
            }
            else if (thing.tag !== 'quote') {
                text.push(`[${thing.tag}]`);
            }
        }
        else {
            text.push(thing);
        }
    });
    // Remove mentions of the original user
    mentions = mentions.filter(({id}) => id !== userId);
    // Sort the list of mentions by name and remove duplicates
    const name = ({name}) => name;
    mentions = _.sortBy(mentions, name);
    mentions = _.sortedUniqBy(mentions, name);
    return [
        text.join('').trim(),
        mentions,
        images
    ];
}

async function getThreadPosts(userId, threadId) {
    const result = [];
    if (!isGoodId(userId) || !isGoodId(threadId)) {
        return;
    }
    for (let page = 1; ;page++) {
        const {thread, posts, pagination: {last_page}} = await apiRequest(`threads/${threadId}/`, 'GET', {
            with_posts: true,
            page
        });
        // Make sure the thread belongs to the given user
        if (thread.user_id !== userId) {
            return;
        }
        posts.forEach((post) => {
            const [text, mentions, images] = redactBBCode(userId, post.message);
            const attachments = [
                ...(post.Attachments || []).map(({direct_url}) => direct_url),
                ...images
            ];
            result.push({
                text,
                mentions,
                attachments,
                viewUrl: post.view_url,
                postDate: utcIsoStringFromDate(new Date(post.post_date * 1000)),
                user: {
                    id: post.user_id,
                    name: post.username
                }
            });
        })
        if (page === last_page) {
            break;
        }
    }
    return result;
}

//-----------------------------------------------------------------------------

async function startForumThread(userId, forumId, title, message) {
    const {thread: {thread_id}} = await apiRequest('threads/', 'POST', {
        node_id: forumId,
        title: title,
        message: message,
        api_bypass_permissions: 1
    },
    {
        // This will create the thread on behalf of the given user
        'XF-Api-User': userId || BARCODE_USER
    });
    return thread_id;
}

//-----------------------------------------------------------------------------

async function postToForumThread(threadId, message) {
    await apiRequest('posts/', 'POST', {
        thread_id: threadId,
        message: message,
        api_bypass_permissions: 1
    },
    {
        'XF-Api-User': BARCODE_USER
    });
}

//-----------------------------------------------------------------------------

async function getAlerts() {
    const {alerts} = await apiRequest('alerts/', 'GET', {
        page: 1,
        unviewed: 1,
        unread: 1
    }, {
        'XF-Api-User': BARCODE_USER
    });
    return alerts;
}

async function markAllAlertsRead() {
    await apiRequest('alerts/mark-all', 'POST', {
        read: 1
    }, {
        'XF-Api-User': BARCODE_USER
    });
}

async function getPost(postId) {
    const {post} = await apiRequest(`posts/${postId}/`, 'GET', {}, {
        'XF-Api-User': BARCODE_USER
    });
    return post;
}

//-----------------------------------------------------------------------------

module.exports = {
    BARCODE_USER,
    validateXenForoUser,
    lookupUser,
    lookupUserWithFallback,
    startConversation,
    sendAlert,
    findUsersWithPrefix,
    getThreadsForItemType,
    startForumThread,
    postToForumThread,
    getDBTCThreadsForUser,
    getThreadPosts,
    validateUserThread,
    getUserEmailAddress,
    getAlerts,
    markAllAlertsRead,
    getPost,
    getTankJournalsForUser
};

// (async function() {
//     const alerts = await getAlerts();
//     console.log('Got', alerts.length, 'alerts');
//     for (const alert of alerts) {
//         const {action, content_id, content_type, alert_text, alert_id} = alert;
//         // If someone mentioned us in a post
//         if (action === 'mention' && content_type === 'post') {
//             console.log(alert_text);
//             await apiRequest(`alerts/${alert_id}/mark`, 'POST', {
//                 read: 1
//             });
//         }
//     }

// })();

