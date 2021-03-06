/* eslint-disable camelcase */

const xenForoApi = require('../xenforo-api');
const {BARCODE_USER} = require('../xenforo');

describe('XenForo API', () => {

    it('should be able to get', async () => {
        const data = await xenForoApi.get('alerts/', {
            page: 1
        },
        {
            'XF-Api-User': BARCODE_USER
        });
        expect(data).toBeDefined();
        expect(data.alerts).toBeDefined();
        expect(data.pagination).toBeDefined();
    });

    it('should be able to post', async () => {
        // This is not a valid request, but we're just testing
        // that a post request works. As such, it should succeed
        // from an HTTPS perspective and return a valid payload
        // with {success: false}
        const data = await xenForoApi.post('auth/from-session', {
            session_id: 'xxx',
            remember_cookie: 'yyy'
        });

        expect(data).toBeDefined();
        expect(data.success).toBe(false);
    });
});
