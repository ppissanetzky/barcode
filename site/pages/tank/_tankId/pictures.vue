<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card elevation="6" :loading="loadingPictures">
          <v-card-title>
            {{ tank ? `${tank.name} -` : '' }} Pictures
          </v-card-title>
          <v-card-subtitle
            v-if="loadingPictures"
          >
            Loading pictures...this can take a few seconds...
          </v-card-subtitle>
          <v-card-subtitle v-else-if="pictures.length === 0">
            There are no pictures of this tank
          </v-card-subtitle>
          <v-container
            v-if="pictures"
            fluid
          >
            <v-row
              v-for="month in pictures"
              :key="month.time"
            >
              <v-col cols="12">
                {{ age(month.time) }}
              </v-col>
              <v-col
                v-for="(p , index) in month.pictures"
                :key="index"
                cols="4"
              >
                <a
                  :href="p.url"
                  target="_blank"
                >
                  <v-img
                    :src="p.picture"
                    :aspect-ratio="1"
                  />
                </a>
              </v-col>
            </v-row>
          </v-container>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import format from 'date-fns/format'
import fromUnixTime from 'date-fns/fromUnixTime'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
export default {
  async fetch () {
    const tankId = this.$route.params.tankId
    const url = `/api/tank/pictures/${tankId}`
    const { tank, months } = await this.$axios.$get(url)
    this.tank = tank
    this.pictures = months
    this.loadingPictures = false
  },

  data () {
    return {
      // Data from the server
      tank: undefined,
      pictures: undefined,
      // While we are loading pictures
      loadingPictures: true
    }
  },

  methods: {
    age (time) {
      const date = fromUnixTime(time)
      const month = format(date, 'MMMM yyyy')
      const distance = formatDistanceToNow(fromUnixTime(time), {
        addSuffix: true
      })
      return `${month} - ${distance}`
    }
  }
}
</script>
