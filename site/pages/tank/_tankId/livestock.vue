<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card elevation="6" :loading="loadingLivestock">
          <v-toolbar flat color="brown lighten-4">
            <v-menu
              offset-y
              close-on-content-click
              close-on-click
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon>
                    mdi-apps
                  </v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item to="parameters">
                  <v-list-item-content>
                    <v-list-item-title>Notes and parameters</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-list-item to="pictures">
                  <v-list-item-content>
                    <v-list-item-title>Pictures</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
                <v-list-item to="livestock">
                  <v-list-item-content>
                    <v-list-item-title>Livestock</v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-menu>
            <v-toolbar-title v-if="tank">
              {{ tank.name }}
            </v-toolbar-title>
            <v-spacer />
            <v-toolbar-title>Livestock</v-toolbar-title>
          </v-toolbar>

          <v-card-subtitle v-if="loadingLivestock">
            Loading livestock...
          </v-card-subtitle>

          <v-card-subtitle v-if="showAssignCoral">
            {{ unassignedFrags.length }} {{ 'coral(s)' }}
            in your collection have not been assigned to any tank.
            Follow
            <router-link to="assign-coral">
              this link
            </router-link>
            to assign them to this one.
          </v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>
    <!-- Temporary alert we show at the bottom when changes are made -->
    <v-snackbar v-model="snackbar" timeout="3000">
      {{ snackbar }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">
          OK
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    this.tankId = this.$route.params.tankId
    const url = `/api/tank/livestock/${this.tankId}`
    const { tank, frags, unassignedFrags, fish } = await this.$axios.$get(url)
    this.tank = tank
    this.frags = frags
    this.fish = fish
    this.unassignedFrags = unassignedFrags
    if (frags.length === 0 && fish.length === 0 && unassignedFrags.length > 0) {
      this.showAssignCoral = true
    }
    this.loadingLivestock = false
  },

  data () {
    return {
      tankId: undefined,
      // Data from the server
      tank: undefined,
      frags: undefined,
      fish: undefined,
      unassignedFrags: undefined,
      // Whether to show the assign coral helper
      showAssignCoral: false,
      // Text for the snackbar when it is open
      snackbar: undefined,
      // While we are loading livestock
      loadingLivestock: true
    }
  },
  computed: {

    hasAnyLivestock () {
      if (this.livestock?.frags?.length || this.livestock?.fish?.length) {
        return true
      }
      return false
    }
  },

  methods: {

    snack (text) {
      this.snackbar = text
    }
  }
}
</script>
