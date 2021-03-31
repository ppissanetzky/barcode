
const express = require('express');
const request = require('supertest');

const {toUnixTime} = require('../dates');
const XenForoApi = require('../xenforo-api');
const app = require('../app');

jest.mock('../xenforo-api');

//-----------------------------------------------------------------------------
// This sets up a mock XenForo auth/from-session API that returns
// mock users basked on remember_cookie
//-----------------------------------------------------------------------------

// BOD
const BOD = 3;
// Supporting members
const SM = 5;
// BARcode admins
const ADMIN = 12;

const MOCK_USERS = new Map([
    // A normal supporting member
    ['sm1', {id: 1, groupId: SM}],
    // An admin supporting member
    ['admin', {id: 2, groupId: SM, secondaryGroupIds: [ADMIN]}],
    // An admin that is not a supporting member
    ['admin-nsm', {id: 3, groupId: ADMIN}],
    // A BOD that is not a supporting member
    ['bod-nsm', {id: 4, groupId: BOD}],
    // A BOD that is a supporting member
    ['bod-sm', {id: 5, groupId: SM, secondaryGroupIds: [BOD]}],
    // An admin, supporting member, BOD
    ['super', {id: 6, groupId: SM, secondaryGroupIds:[ADMIN, BOD]}],
    // A non-supporting member
    ['nsm', {id: 20, groupId: 0}],
    // An invalid user
    ['invalid', {id: 21, groupId: SM, state: 'invalid'}],
    // Another supporting member
    ['sm2', {id: 11, groupId: SM}]
]);

function getMockUser(rememberCookie) {
    const user = MOCK_USERS.get(rememberCookie);
    if (user) {
        const {
            id,
            state = 'valid',
            groupId,
            secondaryGroupIds = [],
            location = 'location',
            isStaff = false
        } = user;
        /* eslint-disable camelcase */
        return ({
            user_id: id,
            user_state: state,
            username: `user-${rememberCookie}`,
            user_group_id: groupId,
            secondary_group_ids: secondaryGroupIds,
            email: `user-${rememberCookie}@example.com`,
            is_staff: isStaff,
            location,
            register_date: toUnixTime(new Date()),
            last_activity: undefined,
            view_url: `https://example.com/${rememberCookie}`,
            avatar_urls: {
                h: `https://example.com/avatar/h/${rememberCookie}`
            },
            message_count: 50
        });
        /* eslint-enable camelcase */
    }
}

function setupMockUsers() {

    // We setup an express app to handle the requests that would
    // normally go to XenForo

    const xf = express();

    xf.use(express.json());

    xf.post('/auth/from-session', (req, res) => {
        const {body: {remember_cookie: rememberCookie}} = req;
        if (!rememberCookie) {
            res.json({success: false});
        }
        const user = getMockUser(rememberCookie);
        if (!user) {
            return res.json({success: false});
        }
        res.json({success: true, user});
    });

    // Now, we mock our get and post methods to request from that express app

    XenForoApi.get.mockImplementation(async (path, params, headers) => {
        const {body} = await request(xf)
            .get(`/${path}`).send(params).set(headers || {});
        return body;
    });

    XenForoApi.post.mockImplementation(async (path, params, headers) => {
        const {body} = await request(xf)
            .post(`/${path}`).send(params).set(headers || {});
        return body;
    });
}

//-----------------------------------------------------------------------------
// Utility to make a request with a given user name
//-----------------------------------------------------------------------------

async function getForUser(user, url) {
    return request(app).get(url).set('cookie', `xfc_user=${user}`);
}

module.exports = {
    MOCK_USERS,
    setupMockUsers,
    XenForoApi,
    getForUser
};
