
const path = require('path');
const fs = require('fs');
const {https} = require('follow-redirects');

const _ = require('lodash');

//-----------------------------------------------------------------------------
// Utility to save an image from a URL, used when importing DBTC items and
// using an image from the forum. 'upload' is the multer instance, so that
// these images go into the same uploads directory with the same type of
// file names. Returns just the file name portion, just like when using
// multer directly.
//-----------------------------------------------------------------------------

async function saveImageFromUrl(upload, url) {
    return new Promise((resolve, reject) => {
        upload.storage.getDestination(null, null, (error, directory) => {
            return error ? reject(error) : resolve(directory);
        });
    })
        .then((directory) => new Promise((resolve, reject) => {
            upload.storage.getFilename(null, null, (error, filename) => {
                if (error) {
                    return reject(error);
                }
                resolve([directory, filename]);
            });
        }))
        .then(([directory, filename]) => new Promise((resolve, reject) => {
            const destination = path.join(directory, filename);
            const stream = fs.createWriteStream(destination);
            const request = https.get(url, (response) => {
                response.pipe(stream);
                response.on('end', () => resolve(filename));
            });
            request.on('error', reject);
        }));
}

//-----------------------------------------------------------------------------

function isGoodId(thing) {
    const value = parseInt(thing, 10);
    return thing && _.isSafeInteger(value) && value > 0;
}

//-----------------------------------------------------------------------------

module.exports = {
    saveImageFromUrl,
    isGoodId
};
