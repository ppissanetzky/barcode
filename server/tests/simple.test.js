
const request = require('supertest');

const {setupMockUsers} = require('./setup-mock-users');

const XenForoApi = require('../xenforo-api');

const app = require('../app');

beforeAll((done) => {
    setupMockUsers();
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
