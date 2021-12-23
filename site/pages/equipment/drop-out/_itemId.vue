<template>
  <v-container fluid>
    <v-card
      v-if="item"
      elevation="6"
      width="375px"
    >
      <v-card-title v-text="item.name" />
      <v-divider />
      <v-card-text>
        Are you sure you want to drop out?
        You'll lose your place in line.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          small
          depressed
          color="primary"
          :loading="submitting"
          @click.stop="submit"
        >
          OK
        </v-btn>
        <v-btn
          small
          depressed
          color="secondary"
          @click.stop="$router.replace(`/equipment/queue/${item.itemId}`)"
        >
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    const { itemId } = this.$route.params
    const { item } = await this.$axios.$get(`/api/equipment/item/${itemId}`)
    this.item = item
  },
  data () {
    return {
      item: undefined
    }
  },
  methods: {
    async submit () {
      this.submitting = true
      const { itemId } = this.$route.params
      const url = `/api/equipment/queue/${itemId}`
      await this.$axios.$delete(url)
      // After we are done, go back to the queue
      this.$router.replace(`/equipment/queue/${itemId}`)
    }
  }
}
</script>
