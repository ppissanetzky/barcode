'use strict';

const app = require('./app');
const scheduler = require('./scheduler');

//-----------------------------------------------------------------------------
// The port that the Express application listens to.
//-----------------------------------------------------------------------------

const PORT = 3003;

//-----------------------------------------------------------------------------
// Start listening
//-----------------------------------------------------------------------------

const server = app.listen(PORT, () => {
    console.log(`BARcode ready at http://localhost:${PORT}`);
    // Start the scheduler
    scheduler.start();
});

//-----------------------------------------------------------------------------
// Graceful shutdown for docker
//-----------------------------------------------------------------------------

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
