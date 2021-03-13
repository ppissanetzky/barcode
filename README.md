[![Run tests](https://github.com/ppissanetzky/barcode/actions/workflows/test.yml/badge.svg)](https://github.com/ppissanetzky/barcode/actions/workflows/test.yml)

# BARcode

The application consists of two main parts:

 * A static website that uses [Vuetify](https://vuetifyjs.com/en/) UI components and a tool called [Nuxt](https://nuxtjs.org) for the page organization and build. Everything in the `site` directory is for the static website.

* A node server that provides an API for the website to fetch data from the databases. The server lives in the `server` directory.

## Development

During **development**, we use Nuxt to start a local web server that builds the web application and also serves it on `http://localhost:3000`. We also start the node server which exposes its API on `http://localhost:3003`. Finally, we start a web server to proxy to the API server and serve uploaded images.

### Setup

You will need to have node and [docker compose](https://docs.docker.com/compose/install/) installed.

```bash

# Install dependencies

$ npm install

# Copy the environment file template to your home directory and rename it

$ cp server/barcode-env.template ~/barcode-env

# Start the node API server at localhost:3003
#
# This will watch for file changes and restart the server automatically
# The server will pretend that all requests come from the BC_TEST_USER
# specified in barcode-env
#
# If the server has trouble starting, look at the values for
# BC_UPLOADS_DIR and BC_DATABASE_DIR in the barcode-env file. They should
# point to existing directories on your machine that are writable

$ npm run server

# In a separate terminal, start the web server

$ npm run web-server

# In a third terminal, build the web application and serve
# it at localhost:3000
#
# This starts a web server that builds and serves the web application
# watching for file changes and restarting automatically

$ npm run dev

# In your browser, navigate to http://localhost:3000
```

## Production

In the production environment, we're using Docker containers. This makes the system much more portable: requiring no server configuration (aside from Docker and SSL certificates).

One container has the web server itself (nginx) and the static site contents. The second container has the API server and the database.

## API Keys

The node server needs an API key to access XenForo. Without this, a lot of things won't work.

It also needs another API key to use AWS services.

Contact admin@bareefers.org to get keys.
