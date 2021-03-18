
const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

async function setup() {
    _.each(ENV_VARIABLES, (value, key) => {
        process.env[key] = value;
    });
    process.env.BC_UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
    process.env.BC_DATABASE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'databases-'));
}

module.exports = setup;
