'use strict';

const {createReadStream} = require('fs');

async function importTankEntries(db, tankId, path, parser) {
    const stream = createReadStream(path);
    const {invalid, entries} = await parser(stream);
    let imported = 0;
    let existing = 0;
    for (const entry of entries) {
        const {entryTypeId, time, value} = entry;
        const found = db.findEntry(tankId, entryTypeId, time, value);
        if (found) {
            existing++;
        }
        else {
            db.addEntry(tankId, entry);
            imported++;
        }
    }
    return {imported, existing, invalid};
}

module.exports = {
    importTankEntries
};
