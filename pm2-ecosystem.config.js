module.exports = {
  apps : [
      // The express app that serves the data
      {
        name: "bc",
        script: "./server/server.js",
        instances: 2,
        exec_mode: "cluster",
        time: true,
        watch: false,
        env: {
          "BC_UPLOADS_DIR": "/home/admin3/barcode-data/uploads/bc/uploads",
          "BC_DATABASE_DIR": "/home/admin3/barcode-data/databases",
          "NODE_ENV": "development"
        },
        env_production: {
          "BC_UPLOADS_DIR": "/home/admin3/barcode-data/uploads/bc/uploads",
          "BC_DATABASE_DIR": "/home/admin3/barcode-data/databases",
          "NODE_ENV": "production"
        }
      },
  ]
}
