
const request = require('supertest');

const {setupMockUsers, getForUser} = require('./setup-mock-users');

const DbtcDatabase = require('../dbtc-database');
const app = require('../app');

beforeAll((done) => {
    setupMockUsers();
    done();
});

beforeEach((done) => {
    DbtcDatabase.db.transaction(({run}) => {
        run('DELETE FROM fans');
        run('DELETE FROM journals');
        run('DELETE FROM frags');
        run('DELETE FROM mothers');
        run('DELETE FROM shares');
        done();
    });
});

describe('Authentication', () => {
    it('should return 401 without cookies', async () => {
        const response = await request(app).get('/dbtc/your-collection');
        expect(response.status).toBe(401);
    });
    it('should return 401 with bad cookies', async () => {
        const response = await getForUser('some-bad-user', '/dbtc/your-collection');
        expect(response.status).toBe(401);
    });
    it('should succeed with cookies', async () => {
        const response = await getForUser('sm1', '/dbtc/your-collection');
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
