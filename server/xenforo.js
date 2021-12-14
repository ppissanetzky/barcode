/* eslint-disable camelcase */

const assert = require('assert');
const _ = require('lodash');

// https://github.com/JiLiZART/bbob/tree/master/packages/bbob-core
const bbob = require('@bbob/core').default;

const {BC_FORUM_MODE} = require('./barcode.config');

const dbtcDatabase = require('./dbtc-database');
const equipmentDatabase = require('./equipment-database');

const {utcIsoStringFromDate, utcIsoStringFromUnixTime, age} = require('./dates');

const {isGoodId} = require('./utility');

const XenForoApi = require('./xenforo-api');

//-----------------------------------------------------------------------------
// TEST USERS
//-----------------------------------------------------------------------------
// 16186 - barcode1
// 16188 - barcode2
// 16189 - barcode3
// 16190 - barcode4

//-----------------------------------------------------------------------------

const POSTING_ENABLED =
    BC_FORUM_MODE === 'production' ||
    parseInt(BC_FORUM_MODE, 10) > 0;

//-----------------------------------------------------------------------------
// This is the user we impersonate when we need to - when creating alerts
// or conversations
//-----------------------------------------------------------------------------

const BARCODE_USER = 16211;

//-----------------------------------------------------------------------------
// XenForo custom groups
//-----------------------------------------------------------------------------

// BOD
const BOD = 3;

// Supporting members
const SM = 5;

// BARcode admins
const ADMIN = 12;

//-----------------------------------------------------------------------------
// Anyone in these groups is allowed to use the system
//-----------------------------------------------------------------------------

const ALLOWED_GROUPS = new Set([BOD, SM, ADMIN]);

//-----------------------------------------------------------------------------
// Anyone that belongs to these groups can impersonate another user
//-----------------------------------------------------------------------------

const IMPERSONATE_GROUPS = new Set([BOD, ADMIN]);

//-----------------------------------------------------------------------------
// Anyone that belongs to these groups can use the admin interface
//-----------------------------------------------------------------------------

const ADMIN_GROUPS = new Set([BOD, ADMIN]);

//-----------------------------------------------------------------------------
// Admin forum ID
//-----------------------------------------------------------------------------

const ADMIN_FORUM_ID = 103;

//-----------------------------------------------------------------------------
// Tank journals forum ID
//-----------------------------------------------------------------------------

const TANK_JOURNALS_FORUM_ID = 22;

//-----------------------------------------------------------------------------

function getUserGroups(xfUser) {
    const {user_group_id = -1, secondary_group_ids = []} = xfUser;
    return [user_group_id, ...secondary_group_ids];
}

function isUserInGroup(xfUser, group) {
    return getUserGroups(xfUser).some((id) => group.has(id));
}

function isXfUserAllowed(xfUser) {
    return isUserInGroup(xfUser, ALLOWED_GROUPS);
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
    const holder = equipmentDatabase.getHolder(user_id);
    return ({
        id: parseInt(user_id, 10),
        name: username,
        allowed: isXfUserAllowed(xfUser),
        canImpersonate: isUserInGroup(xfUser, IMPERSONATE_GROUPS),
        canHoldEquipment: Boolean(holder),
        isAdmin: isUserInGroup(xfUser, ADMIN_GROUPS),
        title: user_title,
        location: holder ? holder.location : location,
        age,
        isStaff: is_staff,
        registerDate: utcIsoStringFromUnixTime(register_date),
        // Users can decide whether their activity is seen. When they
        // opt out, last_activity is undefined
        lastActivity: last_activity ? utcIsoStringFromUnixTime(last_activity) : undefined,
        viewUrl: view_url,
        avatarUrl: h,
        messageCount: message_count,
        // For the market, when we introduce users from other sources
        externalUserId: `forum:${user_id}`
    });
}

//-----------------------------------------------------------------------------
// This is a cache of users we keep around.
// TODO: clear items every so often - unbounded growth otherwise. We only
// have ~200 supporting members, so it shouldn't get out of hand.
//-----------------------------------------------------------------------------

const USER_CACHE = new Map();

// Add a user to the cache

function cacheUser(user) {
    USER_CACHE.set(user.id, user);
    return user;
}

// Get a user object from the cache given a user ID. Returns a user object
// or undefined if the user is not found or the request fails. If the user
// is not allowed to use the system, it returns undefined unless
// 'forDisplayOnly' is set to true, in which case, the user is returned
// regardless

async function lookupUser(userId, forDisplayOnly, includeEmail) {
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
    // If the email is not requested, we can use a cached user
    if (!includeEmail) {
        const result = USER_CACHE.get(id);
        if (result) {
            return result;
        }
    }
    // Otherwise, look the user up in XenForo
    try {
        const {user} = await XenForoApi.get(`users/${id}/`, {
            // Without this, we don't get information about the secondary
            // groups and we cannot determine whether the user is allowed
            api_bypass_permissions: 1
        });
        const isAllowed = isXfUserAllowed(user);
        /*
        if (!isAllowed) {
            console.log('USER NOT ALLOWED',
                user.username,
                user.user_title,
                user.user_state,
                user.user_group_id,
                user.secondary_group_ids);
        }
        */
        if (user && (forDisplayOnly || isAllowed)) {
            // Create the user and cache it
            const result = cacheUser(makeUser(user));
            // If the email is not needed, we can just return that
            if (!includeEmail) {
                return result;
            }
            // Otherwise, we return a new object that has the email
            return ({
                ...result,
                email: user.email
            });
        }
    }
    catch (error) {
        console.error(`Failed to lookup user ${id} :`, error);
    }
}

async function getUserEmailAddress(userId) {
    const {user} = await XenForoApi.get(`users/${userId}/`, {
        // Without this, we don't get information about the secondary
        // groups and we cannot determine whether the user is allowed
        api_bypass_permissions: 1
    });
    return user.email;
}

async function lookupUserWithFallback(userId) {
    const user = await lookupUser(userId);
    if (!user) {
        console.warn('Failed to look up user', userId);
    }
    return user || ({id: 0, name: '<unknown>'});
}

//-----------------------------------------------------------------------------
// users is an array of user IDs
// see: https://xenforo.com/community/pages/api-endpoints/#route_post_conversations_
//-----------------------------------------------------------------------------

async function startConversation(users, title, body, closed) {
    console.log('New PM with', users);
    console.log(`"${title}"`);
    console.log(`"${body}"`);
    if (!POSTING_ENABLED) {
        return ({
            url: 'not-posted'
        });
    }
    const response = await XenForoApi.post('conversations/', {
        'recipient_ids[]': users,
        title,
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
    const {conversation} = response;
    if (!conversation) {
        throw new Error('Missing conversation');
    }
    return ({
        url: conversation.view_url
    });
}

//-----------------------------------------------------------------------------
// Send an alert to the given user ID. Alerts cannot include BBcode but may
// have a single link which is {link} in the body
// see: https://xenforo.com/community/pages/api-endpoints/#route_post_alerts_
//-----------------------------------------------------------------------------

async function sendAlert(recipientId, body, linkText, linkUrl) {
    console.log('New alert to', recipientId);
    console.log(`"${body}"`);
    console.log(`"${linkText}"`);
    console.log(`"${linkUrl}"`);
    if (!POSTING_ENABLED) {
        return;
    }
    const response = await XenForoApi.post('alerts/', {
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
    const response = await XenForoApi.get('users/find-name', {
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
    if (!thread) {
        return;
    }
    const startDate = utcIsoStringFromDate(new Date(thread.post_date * 1000));
    const lastPostDate = utcIsoStringFromDate(new Date(thread.last_post_date * 1000));
    return ({
        startDate,
        lastPostDate,
        userId:         thread.user_id,
        sortKey:        thread.last_post_date,
        threadId:       thread.thread_id,
        startAge:       age(startDate, 'today', 'ago'),
        lastPostAge:    age(lastPostDate, 'today', 'ago'),
        title:          thread.title,
        name:           nameFromThreadTitle(thread.title),
        viewUrl:        thread.view_url
    });
}

//-----------------------------------------------------------------------------

async function getThreadsForItemType(userId, type) {
    const {forumId} = dbtcDatabase.getType(type) || {};
    if (!forumId) {
        return [];
    }
    const {threads = []} = await XenForoApi.get(`forums/${forumId}`, {
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
        const {threads} = await XenForoApi.get(`forums/${forumId}`, {
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
    const {threads} = await XenForoApi.get(`forums/${TANK_JOURNALS_FORUM_ID}`, {
        with_threads: 1,
        page: 1,
        starter_id: userId
    });
    return threads ? threads.map(({title, view_url}) => ({title, url: view_url})) : [];
}

//-----------------------------------------------------------------------------
// Get information about a thread
//-----------------------------------------------------------------------------

async function getThread(threadId) {
    if (isGoodId(threadId)) {
        const {thread} = await XenForoApi.get(`threads/${threadId}/`);
        // Could be undefined
        return convertThread(thread);
    }
}

//-----------------------------------------------------------------------------
// Make sure the thread belongs to the given user.
//-----------------------------------------------------------------------------

async function validateUserThread(userId, threadId) {
    const thread = await getThread(threadId);
    if (thread && thread.userId === userId) {
        return thread;
    }
}

//-----------------------------------------------------------------------------
// This function takes a XenForo post body, which uses BB code and removes
// quotes altogether. It finds mentions of users and replaces all other BB code
// tags with just the tag. It creates a more readable message for our purposes
//-----------------------------------------------------------------------------

function redactBBCode(userId, message) {
    let mentions = [];
    const images = [];
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
        const {thread, posts, pagination: {last_page}} = await XenForoApi.get(`threads/${threadId}/`, {
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
        });
        if (page === last_page) {
            break;
        }
    }
    return result;
}

//-----------------------------------------------------------------------------

async function startForumThread(userId, forumId, title, message) {
    console.log('New thread for', userId || BARCODE_USER, 'in forum', forumId);
    console.log(`"${title}"`);
    console.log(`"${message}"`);
    if (!POSTING_ENABLED) {
        return {threadId: 0};
    }
    const {thread} = await XenForoApi.post('threads/', {
        node_id: forumId,
        title,
        message,
        api_bypass_permissions: 1
    },
    {
        // This will create the thread on behalf of the given user
        'XF-Api-User': userId || BARCODE_USER
    });
    return convertThread(thread);
}

//-----------------------------------------------------------------------------

async function postToForumThread(threadId, message) {
    console.log('New post to thread', threadId);
    console.log(`"${message}"`);
    if (!POSTING_ENABLED) {
        return;
    }
    await XenForoApi.post('posts/', {
        thread_id: threadId,
        message,
        api_bypass_permissions: 1
    },
    {
        'XF-Api-User': BARCODE_USER
    });
}

//-----------------------------------------------------------------------------

async function getAlerts() {
    const {alerts} = await XenForoApi.get('alerts/', {
        page: 1,
        unviewed: 1,
        unread: 1
    }, {
        'XF-Api-User': BARCODE_USER
    });
    return alerts;
}

async function markAllAlertsRead() {
    assert(false, 'This XF API has a permissions bug');
    await XenForoApi.post('alerts/mark-all', {
        read: 1
    }, {
        'XF-Api-User': BARCODE_USER
    });
}

async function getPost(postId) {
    const {post} = await XenForoApi.get(`posts/${postId}/`, {}, {
        'XF-Api-User': BARCODE_USER
    });
    return post;
}

//-----------------------------------------------------------------------------

module.exports = {
    BARCODE_USER,
    ADMIN_FORUM_ID,
    makeUser,
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
    getTankJournalsForUser,
    getThread
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

/*
(async function() {
    const rows = dbtcDatabase.db.all(
        `
        select
        ownerId,
        mothers.type,
        (sum(julianday('now') - julianday(dateAcquired)) / totals.total) * 100 as pct

    from
        mothers,
        frags,
        (
            select type, sum(julianday('now') - julianday(dateAcquired)) total
            from mothers, frags
            where mothers.rules = 'dbtc'
            and mothers.motherId = frags.motherId
            and frags.isAlive = 1
            and status is null
            group by 1
        ) as totals
    where
        mothers.rules = 'dbtc'
        and mothers.motherId = frags.motherId
        and frags.isAlive = 1
        and status is null
        and mothers.type = totals.type
        and mothers.type = 'SPS'
    group by
        1 , 2
    order by
        3 desc        `
    );

    for (const row of rows) {
        const user = await lookupUser(row.ownerId, true);
        console.log(`${user.name},${Math.round(row.pct)}`);
    }
})();
*/
