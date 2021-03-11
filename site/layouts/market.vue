<template>
  <v-app>
    <v-app-bar app dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-app-bar-title>BARcode Market</v-app-bar-title>
      <v-spacer />

      <!-- User menu with the button activator -->
      <v-menu
        v-model="showUserMenu"
        absolute
        offset-y
        style="max-width: 375px"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on">
            <v-icon>
              mdi-account-circle-outline
            </v-icon>
          </v-btn>
        </template>
        <v-card>
          <!-- If the user is signed in -->
          <div v-if="user">
            <v-card-text>
              Signed in as {{ user }}
            </v-card-text>
            <v-card-text>
              <v-btn
                :loading="signingOut"
                @click="signOut"
              >
                Sign out
              </v-btn>
            </v-card-text>
          </div>

          <!-- The user is not signed in -->
          <div v-else>
            <v-card-text>
              You are not signed in
            </v-card-text>
            <v-card-text>
              <v-btn
                color="primary"
                :loading="signingIn"
                @click="signInWithBAR"
              >
                Sign in with BAR
              </v-btn>
            </v-card-text>
            <v-card-text>
              <v-btn
                color="secondary"
                @click="signInWithFacebook"
              >
                Sign in with Facebook
              </v-btn>
            </v-card-text>
          </div>
        </v-card>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      temporary
      app
      dark
    >
      <v-list>
        <v-list-item>
          <v-list-item-title>BARcode</v-list-item-title>
          <v-list-item-subtitle>{{ $config.version }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider />
        <v-list-item href="https://bareefers.org/" target="_blank">
          <v-list-item-icon><v-icon>mdi-forum-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Bay Area Reefers</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <v-theme-provider dark>
        <nuxt />
      </v-theme-provider>
    </v-main>
  </v-app>
</template>

<script>
export default {
  async fetch () {
    const { user, seller } = await this.$axios.$get('/api/market/status')
    this.user = user
    this.seller = seller
  },
  data () {
    return {
      // User is the name of the current user if they are signed in. Undefined
      // otherwise.
      user: undefined,
      // True if this user is a seller
      seller: false,

      // Showing the nav drawer or not
      drawer: false,
      // Showing the user menu
      showUserMenu: false,
      // While we are signingIn
      signingIn: false,
      // While we are signingOut
      signingOut: false
    }
  },
  methods: {
    async signOut () {
      this.signingOut = true
      try {
        await this.$axios.$post('/api/market/logout')
        this.$router.go()
      } finally {
        this.signingOut = false
      }
    },
    async signInWithBAR () {
      this.signingIn = true
      try {
        await this.$axios.$post('/api/market/login/bar')
        this.$router.go()
      } finally {
        this.signingIn = false
      }
    },
    signInWithFacebook () {
      window.location.href = '/bc/api/market/login/facebook'
    }
  }
}
</script>
