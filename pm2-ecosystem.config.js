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
          NODE_ENV: "development"
        },
        env_production: {
          NODE_ENV: "production"
        }
      },
  ]
}
