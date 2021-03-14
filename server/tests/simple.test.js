
const express = require('express');
const request = require('supertest');

const {toUnixTime} = require('../dates');

const XenForoApi = require('../xenforo-api');

jest.mock('../xenforo-api');

let app;

beforeAll(async () => {
    //-------------------------------------------------------------------------
    const xf = express();

    xf.use(express.json());

    /* eslint-disable camelcase */

    xf.post('/auth/from-session', (req, res) => {
        const {body: {remember_cookie}} = req;
        let success = false;
        let user;
        if (remember_cookie === '1') {
            success = true;
            user = {
                user_id: parseInt(remember_cookie, 10),
                user_state: 'valid',
                username: `user-${remember_cookie}`,
                user_group_id: 5,
                email: `user-${remember_cookie}@example.com`,
                user_title: 'title',
                location: 'location',
                age: '50',
                is_staff: false,
                register_date: toUnixTime(new Date()),
                last_activity: undefined,
                view_url: `https://example.com/${remember_cookie}`,
                avatar_urls: {
                    h: `https://example.com/avatar/h/${remember_cookie}`
                },
                message_count: 50
            };
        }
        res.json({success, user});
    });

    /* eslint-enable camelcase */

    XenForoApi.get.mockImplementation(async (path, params, headers) => {
        const {body} = await request(xf).get(`/${path}`).send(params).set(headers || {});
        return body;
    });

    XenForoApi.post.mockImplementation(async (path, params, headers) => {
        const {body} = await request(xf).post(`/${path}`).send(params).set(headers || {});
        return body;
    });

    app = require('../app');
});

describe('Mock XenForo API', () => {
    it('should have "auth/from-session"', async () => {
        const body = await XenForoApi.post('auth/from-session');
        expect(body).toBeDefined();
        expect(body.success).toBe(false);
    });
});

describe('DBTC router', () => {
    it('should return 401 without cookies', async () => {
        const response = await request(app).get('/dbtc/your-collection');
        expect(response.status).toBe(401);
    });
    it('should succeed with cookies', async () => {
        const response = await request(app)
            .get('/dbtc/your-collection')
            .set('cookie', 'xfc_user=1');
        expect(response.status).toBe(200);
        const {body} = response;
        expect(body).toBeDefined();
        const {user} = body;
        expect(user).toBeDefined();
        expect(user.id).toBe(1);
        expect(user.allowed).toBe(true);
        expect(user.canImpersonate).toBe(false);
        expect(user.canHoldEquipment).toBe(false);
        expect(user.isAdmin).toBe(false);
        expect(user.location).toBe('location');
        expect(user.isStaff).toBe(false);
        expect(user.lastActivity).toBeUndefined();
        expect(user.externalUserId).toBe('forum:1');

        const {frags} = body;
        expect(frags).toBeDefined();
        expect(frags.length).toBe(0);
    });
});
