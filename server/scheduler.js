
const path = require('path');

const Bree = require('bree');

//-----------------------------------------------------------------------------

const JOBS = [
    // since the server is running in UTC, account for that.
    // THE NEW SERVER IS RUNNING IN PACIFIC TIME, WILL NEED TO ADJUST
    ['backup-database', 'at 11:00 am'],

    ['dbtc-nag', 'every weekday at 5:00 pm'],
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