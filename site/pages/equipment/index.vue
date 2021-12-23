<template>
  <v-container fluid>
    <!--
      A row for the item cards
    -->
    <v-row>
      <v-col
        v-for="item in items"
        :key="item.itemId"
        cols="auto"
      >
        <v-card
          elevation="6"
          width="375px"
        >
          <v-card-title v-text="item.name" />
          <v-card-subtitle>
            {{ item.quantity }} available to borrow for {{ item.maxDays }} days.
            See <a :href="item.rules" target="_blank">rules</a> and <a :href="item.instructions" target="_blank">instructions</a>.
          </v-card-subtitle>
          <v-divider />
          <v-card-text>
            <v-row>
              <v-col />
              <v-col cols="6">
                <v-img :src="item.picture ? `/bc/${item.picture}` : `/bc/picture-placeholder.png`" />
              </v-col>
              <v-col />
            </v-row>
          </v-card-text>
          <v-sheet
            color="primary"
            height="42px"
            @click.stop="$router.push(`/equipment/queue/${item.itemId}`)"
          >
            <v-card-actions>
              <v-spacer />
              <v-btn
                small
                depressed
                color="primary"
              >
                Queue
              </v-btn>
              <v-spacer />
            </v-card-actions>
          </v-sheet>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    const { user, items, ban } = await this.$axios.$get('/api/equipment')
    this.user = user
    items.forEach((item, index) => {
      item.index = index
      item.queue = undefined
    })
    this.items = items
    this.ban = ban
    items.forEach((item) => {
      item.step = 1
    })
  },
  data () {
    return {
      user: {},
      items: [],
      ban: undefined
    }
  }
}
</script>
