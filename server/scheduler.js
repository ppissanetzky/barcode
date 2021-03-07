
const path = require('path');

const Bree = require('bree');

const {BC_DISABLE_SCHEDULER} = require('./barcode.config');

//-----------------------------------------------------------------------------
// since the server is running in UTC, account for that.
//-----------------------------------------------------------------------------

const JOBS = [

    ['backup-database', 'at 10:00 am'], // 2 am

    ['make-thumbnails', 'at 11:00 am'], // 3 am

    ['get-supporting-members', 'every 12 hours'],

    ['dbtc-nag', 'every weekday at 5:00 pm'], // 9 am

    ['equipment-nag', 'at 6:00 pm'], // 10 am

    ['reply-to-mentions', 'every 10 minutes']
];

//-----------------------------------------------------------------------------

const bree = new Bree({
    root: path.join(__dirname, 'jobs'),
    jobs: JOBS.map(([name, interval]) => ({name, interval}))
});

function start() {
    if (BC_DISABLE_SCHEDULER) {
        console.warn('Scheduler is disabled');
        return;
    }
    bree.start();
}

function getJobs() {
    return JOBS.map(([name, schedule]) => ({name, schedule}));
}

function run(name) {
    // Even if scheduler is disabled
    bree.run(name);
}

//-----------------------------------------------------------------------------

module.exports = {
    start,
    getJobs,
    run
};