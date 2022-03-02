<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card elevation="6" :loading="loadingPictures">
          <v-toolbar flat color="deep-purple lighten-4">
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
            <v-toolbar-title>Pictures</v-toolbar-title>
          </v-toolbar>
          <v-card-subtitle v-if="loadingPictures">
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
                  >
                    <template v-slot:placeholder>
                      <v-sheet color="grey" class="fill-height fill-width ma-0" />
                    </template>
                  </v-img>
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
    // Making two requests in parallel because the pictures request can take
    // a long time to complete
    await Promise.all([
      this.$axios.$get(`/api/tank/${tankId}`).then(({ tank }) => {
        this.tank = tank
      }),
      this.$axios.$get(`/api/tank/pictures/${tankId}`).then(({ months }) => {
        this.pictures = months
      })
    ])
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
