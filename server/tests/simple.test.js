
/*
For now, I'm running all tests in one file because of a problem
with better-sqlite3 and jest.
See: https://github.com/JoshuaWise/better-sqlite3/pull/543
*/

const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const {setupMockUsers} = require('./setup-mock-users');
const XenForoApi = require('../xenforo-api');

let app;

beforeAll((done) => {
    const ENV_VARIABLES = {

        BC_XF_API_URL:  'https://bareefers.org/forum/api',
        BC_UPLOADS_DIR:  '', // Set below
        BC_DATABASE_DIR:  '', // Set below
        BC_SESSION_COOKIE_SECRETS:  '111',
        BC_SESSION_COOKIE_NAME:  'session-cookie',
        BC_SESSION_COOKIE_SECURE:  'no',
        BC_MARKET_ENABLED:  'yes',
        BC_TEST_USER:  '0',
        BC_FORUM_MODE:  '0',
        BC_SMS_MODE:  '0',
        BC_DISABLE_SCHEDULER:  '1',
        BC_SITE_BASE_URL:  '/',
        AWS_ACCESS_KEY_ID:  '111',
        AWS_SECRET_ACCESS_KEY:  '111',
        BCM_FACEBOOK_APP_ID:  '111',
        BCM_FACEBOOK_APP_SECRET:  '111',
        BC_XF_DB_SSH_CREDENTIALS:  '111',
        BC_XF_DB_CREDENTIALS:  '111'
    };

    _.each(ENV_VARIABLES, (value, key) => {
        process.env[key] = value;
    });
    process.env.BC_UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
    process.env.BC_DATABASE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'databases-'));

    setupMockUsers();

    app = require('../app');

    done();
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
    it('should return 401 with bad cookies', async () => {
        const response = await request(app)
            .get('/dbtc/your-collection')
            .set('cookie', 'xfc_user=some-bad-user');
        expect(response.status).toBe(401);
    });
    it('should succeed with cookies', async () => {
        const response = await request(app)
            .get('/dbtc/your-collection')
            .set('cookie', 'xfc_user=sm1');
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
        expect(user.isStaff).toBe(false);
        expect(user.externalUserId).toBe('forum:1');

        const {frags} = body;
        expect(frags).toBeDefined();
        expect(frags.length).toBe(0);
    });
});

describe('Admin access', () => {
    it.each([
        ['xxx', 401],
        [undefined, 401],
        ['sm1', 403],
        ['nsm', 403],
        ['invalid', 403],
        ['admin', 200],
        ['admin-nsm', 200],
        ['bod-nsm', 200],
        ['bod-sm', 200],
        ['super', 200]
    ])('%s should return %i', async (name, statusCode) => {
        const response = await request(app)
            .get('/admin/scripts')
            .set('cookie', `xfc_user=${name}`);
        expect(response.status).toBe(statusCode);
        if (statusCode === 200) {
            const {body: {scripts, jobs}} = response;
            expect(scripts).toBeDefined();
            expect(jobs).toBeDefined();
        }
    });
});

