
const fs = require('fs');
const os = require('os');
const assert = require('assert');

function teardown() {
    const tmpdir = os.tmpdir();
    const {BC_UPLOADS_DIR, BC_DATABASE_DIR} = process.env;
    assert(BC_UPLOADS_DIR.startsWith(tmpdir));
    assert(BC_DATABASE_DIR.startsWith(tmpdir));
    fs.rmdirSync(BC_UPLOADS_DIR, {recursive: true});
    fs.rmdirSync(BC_DATABASE_DIR, {recursive: true});
}

module.exports = teardown;
