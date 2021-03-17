const request = require('supertest');

const {setupMockUsers} = require('./setup-mock-users');

const app = require('../app');

beforeAll((done) => {
    setupMockUsers();
    done();
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
