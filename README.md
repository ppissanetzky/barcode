# BARcode

The application consists of two main parts:

 * A static website that uses [Vuetify](https://vuetifyjs.com/en/) UI components and a tool called [Nuxt](https://nuxtjs.org) for the page organization and build. Everything in the `site` directory is for the static website.

* A node server that provides an API for the website to fetch data from the databases. The server lives in the `server` directory.

## Development

During **development**, we use Nuxt to start a local web server that builds the web application and also serves it on `http://localhost:3000`. We also start the node server which exposes its API on `http://localhost:3003`. The web application makes network requests to the node server.

### Setup

```bash

# Install dependencies

$ npm install

# Make a copy of the environment file
# See server/barcode.config.js for details about the options
#
# THE .env FILE SHOULD NEVER BE CHECKED IN TO GIT

$ cd server
$ cp .env.template .env

# Start the node API server at localhost:3003
#
# This will watch for file changes and restart the server automatically
# The server will pretend that all requests come from the BC_TEST_USER
# specified in .env
#
# If the server has trouble starting, look at the values for
# BC_UPLOADS_DIR and BC_DATABASE_DIR in the .env file. They should
# point to existing directories on your machine that are writable

$ npm run server

# In a separate terminal, build the web application and serve
# it at localhost:3000
#
# This starts a web server that builds and serves the web application
# watching for file changes and restarting automatically

$ npm run dev

# In your browser, navigate to http://localhost:3000
```

## Production

In a **production** environment, the web application would be built using Nuxt commands and then all of its files would be copied to the web server. The node server has to be started as a separate process on the same host as the web server and exposed via the web server.

In the current production environment we use `bareefers-build.sh` to build the site and copy it and `pm2-ecosystem.config.js` to manage the server processes.

## Containerized Production

In the next production environment, we're going to use Docker containers. This makes the system much more portable: requiring no server configuration (aside from Docker and SSL certificates).

One container has the web server itself (nginx) and the static site contents. The second container has the API server and the database. You can try this out by running `npm run build-containers` and `npm run start-containers`. This will create both containers and start them on your machine. You can then browse to `http://localhost:8080`.

## API Key

The node server needs an API key to access XenForo. Contact admin@bareefers.org to get one. Without this, a lot of things won't work.
