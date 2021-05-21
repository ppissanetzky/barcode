<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card width="375px">
          <v-card-title>Add a new item to the {{ swap.name }} on {{ swap.date }}</v-card-title>
          <v-card-text>
            <p>
              Choose the source item from your collection. If you don't see it listed below, you will need to
              <router-link :to="{path: '/add-new-item', query: {collection: 'private'}}">
                <span>add it to your collection</span>
              </router-link>
              first and then come back here to add it to the swap.
            </p>
            <v-autocomplete
              v-model="sourceFrag"
              :items="frags"
              clearable
              outlined
              hide-details
            />
          </v-card-text>

          <v-card-text>
            <p>
              Select the category for this item. If you're unsure, leave it as 'standard'. This may change once the item is reviewed.
            </p>
            <v-autocomplete
              v-model="category"
              :items="['free', 'standard', 'bonus', 'ultra']"
              clearable
              outlined
              hide-details
            />
          </v-card-text>

          <v-card-text>
            <p>
              If you are donating this item for someone else to swap, select their user name below. Otherwise, leave it blank.
            </p>
            <bc-user-autocomplete v-model="trader" />
          </v-card-text>
          <!-- The button to continue -->

          <v-card-text>
            <v-btn
              color="primary"
              :disabled="!sourceFrag || !category"
              :loading="adding"
              @click="submit"
            >
              Add it now
            </v-btn>
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
import { dateFromIsoString } from '~/dates'
import BcUserAutocomplete from '~/components/BcUserAutocomplete.vue'
export default {
  components: { BcUserAutocomplete },
  async fetch () {
    const { swapId } = this.$route.params
    await Promise.all([
      this.$axios.$get(`/api/dbtc/swap/${swapId}`),
      this.$axios.$get('/api/dbtc/your-collection')
    ]).then(([{ swap }, { user, frags }]) => {
      const date = dateFromIsoString(swap.date)
      swap.date = date.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      this.swap = swap
      this.frags = frags
        .filter(({ isAlive }) => isAlive)
        .map(({ name, rules, fragId }) => ({
          text: `${name} (${rules.toUpperCase()})`,
          value: fragId
        }))
        .sort((a, b) => {
          if (a.text < b.text) {
            return -1
          }
          if (a.text > b.text) {
            return 1
          }
          return 0
        })
    })
  },
  data: () => ({
    swap: {},
    // The frags in this user's collection
    frags: [],
    // The selected source frag
    sourceFrag: undefined,
    // The category
    category: 'standard',
    // The trader
    trader: undefined,
    // To gray out the button
    adding: false,
    // Snack bar
    snackbar: false,
    snackbarText: undefined
  }),
  methods: {
    async submit () {
      this.adding = true
      const formData = new FormData()
      formData.set('swapId', this.swap.swapId)
      formData.set('sourceFragId', this.sourceFrag)
      formData.set('category', this.category)
      if (this.trader) {
        formData.set('traderId', this.trader.id)
      }
      await this.$axios.$post('/api/dbtc/swap/add', formData)
      this.sourceFrag = undefined
      this.category = 'standard'
      this.trader = undefined
      this.snackbarText = 'Item added to the swap'
      this.snackbar = true
      this.adding = false
    }
  }
}
</script>
