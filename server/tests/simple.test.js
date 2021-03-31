
const {setupMockUsers, MOCK_USERS, getForUser} = require('./setup-mock-users');

const {nowAsIsoString} = require('../dates');
const DbtcDatabase = require('../dbtc-database');

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
