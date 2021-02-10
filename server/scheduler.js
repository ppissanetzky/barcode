
const path = require('path');

const Bree = require('bree');

//-----------------------------------------------------------------------------

const JOBS = [
    ['backup-database', 'at 4:00 am']
];

//-----------------------------------------------------------------------------

function scheduler() {
    const bree = new Bree({
        root: path.join(__dirname, 'jobs'),
        jobs: JOBS.map(([name, interval]) => ({name, interval}))
    });
    bree.start();
}

//-----------------------------------------------------------------------------

module.exports = scheduler;