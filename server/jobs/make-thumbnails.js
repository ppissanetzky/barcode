
const fs = require('fs');
const path = require('path');

const {resizeImage} = require('../image-resizer');
const {BC_UPLOADS_DIR} = require('../barcode.config');
const {lock} = require('../lock');

const db = require('../dbtc-database');

function source(name) {
    return path.join(BC_UPLOADS_DIR, name);
}

lock('make-thumbnails', () => {

    return Promise.all(fs.readdirSync(BC_UPLOADS_DIR)
        // Ignore all files with an extension
        .filter((name) => !name.includes('.'))
        .map(async (name) => {
            try {
                const resized = await resizeImage(name);
                console.log(name, resized);
            }
            catch (error) {
                console.error(name, 'failed', error.message);
                console.log('Removing from database');
                db.clearFragPicture(name);
                console.log('Renaming');
                fs.rename(source(name), `${source(name)}.bad`, () => {});
            }
        }));
});
