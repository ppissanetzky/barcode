<template>
  <v-app>
    <v-app-bar app>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <router-link to="/">
        <v-img
          src="/bc/barcode-logo-375.png"
          max-width="150px"
        />
      </router-link>
      <v-spacer />
      <v-btn
        small
        :color="impersonating ? 'red' : ''"
        @click.stop="showImpersonate = canImpersonate || impersonating"
      >
        <v-icon left>mdi-account-circle-outline</v-icon>
        {{ name }}
      </v-btn>
      <v-dialog
        v-model="showImpersonate"
        max-width="375px"
      >
        <v-card v-if="impersonating">
          <v-card-title>Stop impersonating {{ name }}</v-card-title>
          <v-card-actions>
            <v-btn
              @click="showImpersonate=false"
            >
              Cancel
            </v-btn>
            <v-btn
              text
              @click="stopImpersonating"
            >
              Stop
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card v-else>
          <v-card-title>Select a user to impersonate</v-card-title>
          <v-card-actions>
            <bc-user-autocomplete
              v-model="impersonateUser"
              allow-all
            />
          </v-card-actions>
          <v-card-actions>
            <v-btn
              text
              @click="showImpersonate=false"
            >
              Cancel
            </v-btn>
            <v-btn
              text
              :disabled="!impersonateUser"
              @click="impersonate"
            >
              Impersonate
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      temporary
      app
    >
      <v-list>
        <v-list-item>
          <v-list-item-title>BARcode</v-list-item-title>
          <v-list-item-subtitle>{{ $config.version }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider />
        <v-list-item to="/add-new-item">
          <v-list-item-icon><v-icon>mdi-plus-circle-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Add a new item</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/">
          <v-list-item-icon><v-icon>mdi-fishbowl-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Your collection</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/collection/dbtc">
          <v-list-item-icon><v-icon>mdi-sitemap</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>DBTC collection</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/top10">
          <v-list-item-icon><v-icon>mdi-trophy-variant-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>DBTC top 10</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <!-- <v-list-item to="/stats">
          <v-list-item-icon><v-icon>mdi-chart-box-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>DBTC member stats</v-list-item-title>
          </v-list-item-content>
        </v-list-item> -->
        <v-list-item to="/import">
          <v-list-item-icon><v-icon>mdi-import</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Import DBTC threads</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/collection/pif">
          <v-list-item-icon><v-icon>mdi-cash-remove</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>PIF collection</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/equipment">
          <v-list-item-icon><v-icon>mdi-toolbox-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Equipment</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/members">
          <v-list-item-icon><v-icon>mdi-card-account-details-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Members</v-list-item-title>
          </v-list-item-content>
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
      <nuxt />
    </v-main>
  </v-app>
</template>

<script>
export default {
  async fetch () {
    const { name, canImpersonate, impersonating } = await this.$axios.$get('/api/impersonate')
    this.name = name
    this.canImpersonate = canImpersonate
    this.impersonating = impersonating
  },
  data () {
    return {
      // The current user name
      name: undefined,
      // Whether the original user can impersonate
      canImpersonate: undefined,
      // True if impersonating
      impersonating: undefined,

      // Show the navigation drawer or not
      drawer: false,
      // Show the impersonate dialog
      showImpersonate: false,
      // The user selected in the impersonate dialog
      impersonateUser: undefined
    }
  },
  methods: {
    async stopImpersonating () {
      this.showImpersonate = false
      await this.$axios.$delete('/api/impersonate')
      this.$router.go()
    },
    async impersonate () {
      this.showImpersonate = false
      const { id } = this.impersonateUser
      await this.$axios.$put(`/api/impersonate/${id}`)
      this.$router.go()
    }
  }
}
</script>
