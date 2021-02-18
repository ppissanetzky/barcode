
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

const {BC_UPLOADS_DIR} = require('../barcode.config');
const {lock} = require('../lock');

lock('make-thumbnails', () => {
    function source(name) {
        return path.join(BC_UPLOADS_DIR, name);
    }
    function small(name) {
        return path.join(BC_UPLOADS_DIR, `${name}.small`);
    }

    const OPTIONS = {
        width: 375,
        height: 300,
        fit: 'outside'
    };

    return Promise.all(fs.readdirSync(BC_UPLOADS_DIR)
        // Ignore all files with an extension
        .filter((name) => !name.includes('.'))
        // Ignore any that already have a .small counterpart
        .filter((name) => !fs.existsSync(small(name)))
        .map(async (name) => sharp(source(name))
            .resize(OPTIONS)
            .toFile(small(name))
            .catch((error) => console.error(name, 'failed', error)))
            // TODO: could remove these files, and/or go into the database
            // and remove them from the frags or journals table
    );
});
