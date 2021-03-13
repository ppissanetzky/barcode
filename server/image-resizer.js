const assert = require('assert');
const path = require('path');
const fs = require('fs/promises');

const sharp = require('sharp');

const {BC_UPLOADS_DIR} = require('./barcode.config');

//-----------------------------------------------------------------------------
// This is for card images where the width is 375 and the height is 300.
// 'outside' means that we resize them to be >= 375x300 with the original
// aspect ratio.
//-----------------------------------------------------------------------------

const OPTIONS = {
    width: 375,
    height: 300,
    fit: 'outside'
};

//-----------------------------------------------------------------------------

async function resizeImage(fileName, options) {
    assert(fileName);
    const source = path.join(BC_UPLOADS_DIR, fileName);
    const destination = path.join(BC_UPLOADS_DIR, `${fileName}.small`);
    let result = false;
    try {
        // If we succeed, it means the file exists, so we
        // fall through and do nothing
        await fs.access(destination);
    }
    catch {
        // The file doesn't exist, so we do the resize. This could
        // throw an error too
        await sharp(source).rotate().resize(options || OPTIONS).jpeg().toFile(destination);
        result = true;
    }
    return result;
}

//-----------------------------------------------------------------------------

module.exports = {
    resizeImage
};
