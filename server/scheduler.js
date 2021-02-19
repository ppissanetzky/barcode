
const path = require('path');

const Bree = require('bree');

//-----------------------------------------------------------------------------
// since the server is running in UTC, account for that.
//-----------------------------------------------------------------------------

const JOBS = [

    ['make-thumbnails', 'at 10:00 am'], // 2 am

    ['backup-database', 'at 11:00 am'], // 3 am

    ['dbtc-nag', 'every weekday at 5:00 pm'], // 9 am

    ['equipment-nag', 'at 6:00 pm'] // 10 am
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