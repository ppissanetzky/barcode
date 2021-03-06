
const assert = require('assert');

import colors from 'vuetify/es5/util/colors'

const version = process.env.BC_VERSION;

assert(version, 'Missing BC_VERSION environment variable');

console.log('Version', version);

//-----------------------------------------------------------------------------

export default {
  // Disable server-side rendering (https://go.nuxtjs.dev/ssr-mode)
  ssr: false,

  // Target (https://go.nuxtjs.dev/config-target)
  target: 'static',

  // Global page headers (https://go.nuxtjs.dev/config-head)
  head: {
    // titleTemplate: '%s - BARcode',
    title: 'BARcode',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Router
  router: {
    base: '/bc/'
  },

  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: [
  ],

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [
    'plugins/axios.js'
  ],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  components: true,

  // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
  buildModules: [
    // https://go.nuxtjs.dev/eslint
    '@nuxtjs/eslint-module',
    // https://go.nuxtjs.dev/vuetify
    '@nuxtjs/vuetify'
  ],

  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: [
    '@nuxtjs/axios',
    '@nuxtjs/proxy',
  ],

  // The library we use to fetch data from the server
  // https://axios.nuxtjs.org/
  axios: {
    prefix: '/bc/',
    proxy: true,
  },

  proxy: {
    // When we make a request to /api, it gets redirected to our local web
    // server
    '/bc/api/': {
      target: 'http://localhost:8080',
    },
    // When we get a request to /bc/uploads, it gets redirected to a local
    // web server
    '/bc/uploads/': {
      target: 'http://localhost:8080',
    }
  },

  // This is exposed to pages in $config
  publicRuntimeConfig: {
    version,
    redirect401: 'https://bareefers.org/forum/login/',
    redirect403: 'https://www.bareefers.org/forum/threads/how-do-i-become-a-supporting-member.14130/',
  },

  // Vuetify module configuration (https://go.nuxtjs.dev/config-vuetify)
  vuetify: {
    customVariables: ['~/assets/variables.scss'],
    theme: {
      dark: false,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3
        }
      }
    }
  },

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
  }
}
