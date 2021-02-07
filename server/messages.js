
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

const {BC_SITE_BASE_URL} = require('./barcode.config');

const {age} = require('./dates');

//-----------------------------------------------------------------------------
// A helper for handlebars that returns the full URL to a picture, use it like
// this: {{pictureUrl frag.picture}}
//-----------------------------------------------------------------------------

handlebars.registerHelper('pictureUrl', (picture) => {
    return `${BC_SITE_BASE_URL}/uploads/${picture}`;
});

handlebars.registerHelper('fragUrl', (fragId) => {
    return `${BC_SITE_BASE_URL}/frag/${fragId}`;
});

handlebars.registerHelper('motherUrl', (motherId) => {
    return `${BC_SITE_BASE_URL}/kids/${motherId}`;
});

handlebars.registerHelper('age', (date) => {
    return age(date, 'today', 'ago');
});

//-----------------------------------------------------------------------------
// Given the name of a template file in the 'messages' directory and
// some data, this runs it through handlebars. Then it assumes the
// first line is the title. It returns the title and the body as two
// separate strings.
//-----------------------------------------------------------------------------

async function renderMessage(name, context) {
    // Read the template file
    const content = await new Promise((resolve, reject) => {
        const file = path.join(__dirname, 'messages', `${name}.handlebars`);
        fs.readFile(file, 'utf-8', (error, data) => {
            if (error) {
                return reject(error);
            }
            resolve(data);
        });
    });
    // Compile the template
    const template = handlebars.compile(content, {noEscape: true});
    // Run it
    const result = template(context);
    // Now, look for the first new line
    const newLine = result.indexOf('\n');
    // No new line?
    if (newLine < 0) {
        return ['', result.trim()];
    }
    // Return the title and body with surrounding white space removed
    return [
        result.substr(0, newLine).trim(),
        result.substr(newLine + 1).trim()
    ];
}

module.exports = {
    renderMessage
};