<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card elevation="6" :loading="loadingLivestock">
          <v-toolbar flat color="green lighten-4">
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
            <v-toolbar-title>Assign corals</v-toolbar-title>
          </v-toolbar>
          <v-card-text v-if="unassignedFrags.length === 0">
            There are no corals left to assign to this tank.
          </v-card-text>
          <v-card-text v-else>
            <p>
              These corals are in your collection but have not been assigned to any tank yet.
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
              :items="unassignedFrags"
              :single-select="false"
              item-key="fragId"
              show-select
            >
              <template v-slot:[`item.name`]="{ item }">
                <router-link :to="`/frag/${item.fragId}`" target="_blank">
                  {{ item.name }}
                </router-link>
              </template>
              <template v-slot:[`item.dateAcquired`]="{ item }">
                {{ item.date }}
              </template>
            </v-data-table>
          </v-card-text>
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
      unassignedFrags: [],
      // Whether the snackbar is open
      snackbar: false,
      // Text for it
      snackbarText: undefined,
      // While we are loading livestock
      loadingLivestock: true,
      // The frags selected in the unassigned table
      selectedUnassignedFrags: [],
      // The headers for the unassigned frags table
      unassignedFragsHeaders: [
        { text: 'Name', value: 'name' },
        { text: 'Type', value: 'type' },
        { text: 'Collection', value: 'rules' },
        { text: 'Status', value: 'status' },
        {
          text: 'Date acquired',
          value: 'dateAcquired',
          class: 'text-right',
          cellClass: 'text-right',
          sort (a, b) {
            if (a < b) {
              return -1
            }
            if (a > b) {
              return 1
            }
            return 0
          }
        }
      ],
      // While we are assigning frags
      assigningFrags: false
    }
  },

  computed: {
  },

  methods: {

    async loadLivestock () {
      const url = `/api/tank/livestock/${this.tankId}`
      const { tank, unassignedFrags } = await this.$axios.$get(url)
      this.tank = tank
      for (const frag of unassignedFrags) {
        if (!frag.isAlive) {
          frag.status = frag.status || 'dead'
        }
        frag.date = parseISO(frag.dateAcquired).toLocaleDateString()
      }
      this.unassignedFrags = unassignedFrags
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
      // If we assigned all of them, we're going to go back to the livestock
      // page. Otherwise, we stay here, show the snack and reload the unassigned
      // frags
      if (assigned === this.unassignedFrags.length) {
        this.$router.replace('livestock')
      } else {
        this.snack(`Assigned ${assigned} coral${assigned > 1 ? 's' : ''}`)
        await this.loadLivestock()
      }
      this.assigningFrags = false
    },

    snack (text) {
      this.snackbarText = text
      this.snackbar = true
    }
  }
}
</script>
