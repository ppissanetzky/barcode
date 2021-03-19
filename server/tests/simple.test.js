
/*
For now, I'm running all tests in one file because of a problem
with better-sqlite3 and jest.
See: https://github.com/JoshuaWise/better-sqlite3/pull/543
*/

const request = require('supertest');

const {setupMockUsers, MOCK_USERS} = require('./setup-mock-users');

const {nowAsIsoString} = require('../dates');
const app = require('../app');
const XenForoApi = require('../xenforo-api');
const DbtcDatabase = require('../dbtc-database');

//-----------------------------------------------------------------------------
// Utility to make a request with a given user name
//-----------------------------------------------------------------------------

async function getForUser(user, url) {
    return request(app).get(url).set('cookie', `xfc_user=${user}`);
}

//-----------------------------------------------------------------------------

beforeAll((done) => {
    setupMockUsers();
    done();
});

//-----------------------------------------------------------------------------
// Delete data from the database before each test
//-----------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------

describe('Mock XenForo API', () => {
    it('should have "auth/from-session"', async () => {
        const body = await XenForoApi.post('auth/from-session');
        expect(body).toBeDefined();
        expect(body.success).toBe(false);
    });
});

//-----------------------------------------------------------------------------

describe('Access with cookies', () => {
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

//-----------------------------------------------------------------------------

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
        const response = await getForUser(name, '/admin/scripts');
        expect(response.status).toBe(statusCode);
        if (statusCode === 200) {
            const {body: {scripts, jobs}} = response;
            expect(scripts).toBeDefined();
            expect(jobs).toBeDefined();
        }
    });
});

//-----------------------------------------------------------------------------

describe('Frag access', () => {
    const sm1 = MOCK_USERS.get('sm1');
    const sm2 = MOCK_USERS.get('sm2');
    expect(sm1).toBeDefined();
    expect(sm2).toBeDefined();

    it.each([
        ['private', false],
        ['dbtc', true],
        ['pif', true]
    ])('should be correct for %s frags', async (rules, visibleToBoth) => {
        const [mother1, frag1] = DbtcDatabase.insertItem({
            name: 'm1',
            type: 'SPS',
            rules,
            flow: 'Medium',
            light: 'Medium',
            hardiness: 'Normal',
            growthRate: 'Normal',
            ownerId: sm1.id,
            dateAcquired: nowAsIsoString(),
            picture: 'pic1',
            fragsAvailable: 0
        });
        expect(mother1).toBeDefined();
        expect(frag1).toBeDefined();

        // Check that it is in this user's collection
        {
            const response = await getForUser('sm1', '/dbtc/your-collection');
            expect(response.status).toBe(200);
            const {body: {frags, user}} = response;
            expect(user.id).toBe(sm1.id);
            expect(frags).toBeDefined();
            expect(frags).toHaveLength(1);
        }

        // Check that this user can get it
        {
            const {body: {frag}} = await getForUser('sm1', `/dbtc/frag/${frag1}`);
            expect(frag).toBeDefined();
            expect(frag.motherId).toBe(mother1);
            expect(frag.fragId).toBe(frag1);
        }
        // Check that the other user can or cannot
        {
            const {status, body} = await getForUser('sm2', `/dbtc/frag/${frag1}`);
            const {frag} = body;
            if (visibleToBoth) {
                expect(frag).toBeDefined();
                expect(frag.motherId).toBe(mother1);
                expect(frag.fragId).toBe(frag1);

            }
            else {
                expect(status).toBe(500);
                expect(body).not.toHaveProperty('user');
                expect(body).not.toHaveProperty('frag');
            }
        }
    });
});

//-----------------------------------------------------------------------------
