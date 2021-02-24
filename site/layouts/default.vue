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
      <v-dialog
        v-if="user"
        v-model="showImpersonate"
        :disabled="!canImpersonate"
        max-width="375px"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-chip
            label
            outlined
            :color="impersonating ? 'red' : ''"
            v-bind="attrs"
            v-on="on"
          >
            <v-icon left>
              mdi-account-circle-outline
            </v-icon>
            {{ user }}
          </v-chip>
        </template>

        <v-card v-if="impersonating">
          <v-card-title>Stop impersonating {{ user }}</v-card-title>
          <v-card-actions>
            <v-btn
              text
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
        <v-list-item to="/stats">
          <v-list-item-icon><v-icon>mdi-chart-box-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>DBTC member stats</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
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
  data () {
    return {
      drawer: false,
      showImpersonate: false,
      impersonateUser: undefined
    }
  },
  computed: {
    user () {
      return this.$store.state.user.name
    },
    impersonating () {
      return this.$store.state.user.impersonating
    },
    canImpersonate () {
      return this.$store.state.user.canImpersonate
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
