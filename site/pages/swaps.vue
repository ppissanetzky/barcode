<template>
  <v-container fluid>
    <!-- --------------------------------------------------------------------------- -->
    <!-- A row for the swap cards -->
    <!-- --------------------------------------------------------------------------- -->
    <v-row>
      <v-col
        v-for="swap in swaps"
        :key="swap.swapId"
        cols="auto"
      >
        <v-card width="375px">
          <v-card-title v-text="swap.name" />
          <v-divider />
          <v-list subheader>
            <v-list-item>
              <v-list-item-icon>
                <v-icon>mdi-calendar-clock-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>
                  {{ swap.date }}
                </v-list-item-title>
                <v-list-item-title>
                  {{ swap.time }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <a :href="swap.threadUrl" target="_blank">details</a>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>

            <v-list-item>
              <v-list-item-icon>
                <v-icon>mdi-map-marker-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-for="(line, index) in swap.address" :key="index">
                  {{ line }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <a :href="swap.mapUrl" target="_blank">map</a>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <div v-if="swap.participants.length">
            <v-divider />
            <v-card-text>
              <p><strong>Participants</strong></p>
              <v-simple-table dense>
                <tbody>
                  <tr
                    v-for="p in swap.participants"
                    :key="p.user.id"
                  >
                    <td>
                      <a :href="`/member/${p.user.id}`" target="_blank">{{ p.user.name }}</a>
                    </td>
                    <td
                      class="text-right"
                    >
                      {{ p.items }} {{ p.items === 1 ? 'frag' : 'frags' }}
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card-text>
          </div>
          <v-divider />
          <v-card-actions>
            <v-btn text color="primary" :to="`/swap/${swap.swapId}`">
              Check it out
            </v-btn>
            <v-btn v-if="swap.isOpen" text color="primary" :to="`/swap/${swap.swapId}/add`">
              Add a frag
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import { dateFromIsoString } from '~/dates'
export default {
  async fetch () {
    const { swaps } = await this.$axios.$get('/api/dbtc/swaps')
    swaps.forEach((swap) => {
      swap.address = swap.address.split('\\n')
      const date = dateFromIsoString(swap.date)
      swap.date = date.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    })
    this.swaps = swaps
  },
  data () {
    return {
      swaps: []
    }
  }
}
</script>
