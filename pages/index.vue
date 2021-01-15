<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>Your collection</h1>
      </v-col>
    </v-row>
    <!-- A prominent button to add a new item -->
    <v-row>
      <v-col>
        <v-btn depressed color="primary" to="add-new-item">
          Add a new item
        </v-btn>
      </v-col>
    </v-row>

    <!-- The cards of frags -->
    <v-row>
      <v-col
        v-for="frag in frags"
        :key="frag.fragId"
        cols="auto"
      >
        <v-card :to="`frag/${frag.fragId}`" max-width="375">
          <v-img
            v-if="frag.picture"
            :src="`${$config.BC_UPLOADS_URL}/${frag.picture}`"
            max-width="375px"
            max-height="300px"
          />
          <v-img
            v-else
            max-width="375px"
            max-height="300px"
            src="/picture-placeholder.png"
          />

          <v-card-title v-text="frag.name" />
          <v-card-subtitle v-text="frag.scientificName" />
          <v-card-text>
            <v-chip label v-text="frag.type" />
            <v-chip v-if="frag.age" label v-text="frag.age" />
            <v-chip
              v-if="!frag.isAlive"
              color="error"
              label
            >
              RIP
            </v-chip>
            <v-chip v-if="frag.isAvailable" label v-text="`${frag.fragsAvailable} available`" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import { parseISO, differenceInDays, formatDistance, formatDuration } from 'date-fns'

function age (isoDateTime) {
  const today = new Date()
  const future = parseISO(isoDateTime)
  if (isNaN(future)) {
    return
  }
  if (differenceInDays(today, future) === 0) {
    return formatDuration({ days: 1 })
  }
  return formatDistance(today, future)
}

export default {
  async fetch () {
    const { user, frags } = await this.$axios.$get('/bc/api/dbtc/your-collection')
    frags.forEach((frag) => {
      frag.age = age(frag.dateAcquired)
    })

    this.user = user
    this.frags = frags
  },
  data () {
    return {
      user: null,
      frags: null
    }
  }
}
</script>
