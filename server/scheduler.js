
const Bree = require('bree');

//-----------------------------------------------------------------------------

const JOBS = [
    ['backup-database', 'at 4:00 am']
];

//-----------------------------------------------------------------------------

function scheduler() {
    const bree = new Bree({
        jobs: JOBS.map(([name, interval]) => ({name, interval}))
    });
    bree.start();
}

//-----------------------------------------------------------------------------

module.exports = scheduler;