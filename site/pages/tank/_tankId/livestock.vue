<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card elevation="6" :loading="loadingLivestock">
          <v-toolbar flat>
            <v-btn icon @click="drawer = !drawer">
              <v-icon>
                mdi-apps
              </v-icon>
            </v-btn>
            <v-toolbar-title v-if="tank">{{ tank.name }}</v-toolbar-title>
            <v-spacer />
            <v-toolbar-title>Livestock</v-toolbar-title>
          </v-toolbar>
          <v-card-subtitle v-if="loadingLivestock">
            Loading livestock...
          </v-card-subtitle>
          <div v-if="livestock">
            <v-expansion-panels
              v-if="livestock.unassignedFrags.length > 0"
              v-model="expandUnassignedPanel"
              flat
            >
              <v-expansion-panel>
                <v-expansion-panel-header>
                  Assign frags to this tank
                  {{ livestock.unassignedFrags.length ? `(${livestock.unassignedFrags.length} unassigned)` : '' }}
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  <p>
                    These frags are in your collection but have not been assigned to any tank yet.
                    Select the ones that are in this tank (or once were) and click 'Assign' below.
                  </p>
                  <v-btn
                    small
                    color="primary"
                    :disabled="selectedUnassignedFrags.length === 0"
                    :loading="assigningFrags"
                    @click.stop="assignFrags"
                  >
                    Assign {{ selectedUnassignedFrags.length || '' }}
                  </v-btn>
                  <v-data-table
                    v-model="selectedUnassignedFrags"
                    :headers="unassignedFragsHeaders"
                    :items="livestock.unassignedFrags"
                    :single-select="false"
                    item-key="fragId"
                    show-select
                  />
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
          <v-container
            v-if="livestock"
          >
            <v-row>
              <v-col>
                <!-- TODO -->
              </v-col>
            </v-row>
          </v-container>
          <v-navigation-drawer
            v-model="drawer"
            absolute
          >
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
          </v-navigation-drawer>
        </v-card>
      </v-col>
    </v-row>
    <!-- Temporary alert we show at the bottom when changes are made -->
    <v-snackbar v-model="snackbar" timeout="3000">
      {{ snackbarText }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">
          OK
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
<script>
import parseISO from 'date-fns/parseISO'
export default {
  async fetch () {
    this.tankId = this.$route.params.tankId
    await this.loadLivestock()
  },

  data () {
    return {
      tankId: undefined,
      // Data from the server
      tank: undefined,
      livestock: undefined,
      // The nav drawer
      drawer: false,
      // Whether the snackbar is open
      snackbar: false,
      // The text shown in the snackbar
      snackbarText: undefined,
      // While we are loading livestock
      loadingLivestock: true,
      // Whether the panel to assign frags is expanded
      expandUnassignedPanel: false,
      // The frags selected in the unassigned table
      selectedUnassignedFrags: [],
      // The headers for the unassigned frags table
      unassignedFragsHeaders: [
        { text: 'Name', value: 'name' },
        { text: 'Type', value: 'type' },
        { text: 'Collection', value: 'rules' },
        { text: 'Status', value: 'status' },
        { text: 'Date acquired', value: 'date', cellClass: 'text-right' }
      ],
      // While we are assigning frags
      assigningFrags: false
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

    async loadLivestock () {
      const url = `/api/tank/livestock/${this.tankId}`
      const { tank, frags, unassignedFrags, fish } = await this.$axios.$get(url)
      this.tank = tank
      for (const frag of unassignedFrags) {
        if (!frag.isAlive) {
          frag.status = frag.status || 'dead'
        }
        frag.date = parseISO(frag.dateAcquired).toLocaleDateString()
      }
      this.livestock = { frags, unassignedFrags, fish }
      if (frags.length === 0 && unassignedFrags.length > 0) {
        this.expandUnassignedPanel = 0
      }
      this.loadingLivestock = false
    },

    async assignFrags () {
      this.assigningFrags = true
      const formData = new FormData()
      formData.set('tankId', this.tankId)
      for (const frag of this.selectedUnassignedFrags) {
        formData.append('fragId', frag.fragId)
      }
      const url = '/api/tank/assign-frags'
      const { assigned } = await this.$axios.$post(url, formData)
      this.selectedUnassignedFrags = []
      await this.loadLivestock()
      this.assigningFrags = false
      this.snack(`Assigned ${assigned} frag${assigned > 1 ? 's' : ''}`)
    },

    snack (text) {
      this.snackbarText = text
      this.snackbar = true
    }
  }
}
</script>
