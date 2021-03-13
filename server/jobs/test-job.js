
const {lock} = require('../lock');

lock('test-job', () => {
    console.log('Test job is done');
});
