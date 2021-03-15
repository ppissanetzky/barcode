
const path = require('path');

const _ = require('lodash');
const Bree = require('bree');

const {BC_DISABLE_SCHEDULER} = require('./barcode.config');

//-----------------------------------------------------------------------------
// These all depend on the server's timezone, so watch out
// Our container is build to run in PDT
//-----------------------------------------------------------------------------

const JOBS = {

    'at 2:00 am': 'backup-database',

    'at 3:00 am': 'make-thumbnails',

    'at 8:30 am': 'get-supporting-members',

    'every weekday at 9:00 am': 'dbtc-nag',

    'at 9:30 am': 'equipment-nag',

    'every 10 minutes': 'reply-to-mentions'
};

//-----------------------------------------------------------------------------

const bree = new Bree({
    root: path.join(__dirname, 'jobs'),
    jobs: _.map(JOBS, (name, interval) => ({name, interval}))
});

function start() {
    if (BC_DISABLE_SCHEDULER) {
        console.warn('Scheduler is disabled');
        return;
    }
    bree.start();
}

function getJobs() {
    return _.map(JOBS, (name, schedule) => ({name, schedule}));
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
