<template>
  <v-container fluid>
    <v-card
      v-if="item"
      elevation="6"
      width="375px"
    >
      <v-card-title v-text="item.name" />
      <v-divider />
      <v-card-text v-if="!item.isAvailable">
        <p>
          If you are done with the {{ item.shortName }}
          but have not yet passed it on to someone else, you can mark it as available
          by clicking OK below.
        </p>
        <p>
          Otherwise, choose the member that received it.
        </p>
      </v-card-text>
      <v-card-text v-else>
        Who received the {{ item.shortName }}?
      </v-card-text>
      <v-card-actions>
        <v-autocomplete
          v-model="recipientId"
          :items="recipients"
          outlined
          hide-details
          dense
        />
      </v-card-actions>
      <v-card-actions>
        <v-spacer />
        <v-btn
          small
          depressed
          color="primary"
          :disabled="!recipientId"
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
    const [{ item }, { recipients }] = await Promise.all([
      this.$axios.$get(`/api/equipment/item/${itemId}`),
      this.$axios.$get(`/api/equipment/recipients/${itemId}`)
    ])
    this.item = item
    this.recipients = recipients.map(({ id, name, holder }) => ({
      value: id,
      text: `${name}${holder ? ' (to hold)' : ''}`
    }))
    if (!this.item.isAvailable) {
      this.recipients = [
        // Add a sentinel to mark it as available
        {
          value: -1,
          text: 'Mark it as available'
        },
        ...this.recipients
      ]
      this.recipientId = -1
    }
  },
  data () {
    return {
      item: undefined,
      recipientId: undefined,
      recipients: undefined,
      submitting: false
    }
  },
  methods: {
    async submit () {
      this.submitting = true
      const { itemId } = this.$route.params
      // We're marking it as available
      if (this.recipientId === -1) {
        const url = `/api/equipment/done/${itemId}`
        await this.$axios.$put(url)
      } else {
        const url = `/api/equipment/queue/${itemId}/to/${this.recipientId}`
        await this.$axios.$put(url)
      }
      // After we are done, go back to the queue
      this.$router.replace(`/equipment/queue/${itemId}`)
    }
  }
}
</script>
