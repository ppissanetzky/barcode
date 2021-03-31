
const {setupMockUsers, XenForoApi} = require('./setup-mock-users');

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
