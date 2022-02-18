<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-btn
          color="primary"
          to="/add-tank"
        >
          Add a tank
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col
        v-for="tank in tanks"
        :key="tank.tankId"
        cols="auto"
      >
        <v-card
          elevation="6"
          width="375px"
        >
          <v-card-title v-text="tank.name" />
          <v-card-subtitle>
            <div v-if="tank.model">
              {{ tank.model }}
            </div>
            <div>
              {{ tank.displayVolume }}g display / {{ tank.totalVolume }}g total
              <span v-if="tank.dimensions"> / {{ tank.dimensions }} </span>
            </div>
            <div>
              Started {{ tank.dateStarted }}, {{ tank.age }}
            </div>
          </v-card-subtitle>
          <v-card-text v-if="tank.description">
            {{ tank.description }}
          </v-card-text>
          <div v-if="tank.parameters.length > 0">
            <!-- <v-divider /> -->
            <v-container fluid>
              <v-row cols="auto">
                <v-col
                  v-for="p in tank.parameters"
                  :key="p.name"
                >
                  <v-card
                    :color="p.color"
                    width="100px"
                  >
                    <v-card-text>
                      <div>
                        {{ p.name }}
                      </div>
                      <div class="text-h5">
                        <strong>{{ p.text }}</strong>
                      </div>
                      <div class="text-caption text--disabled">
                        {{ p.age }}
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-container>
          </div>
          <v-sheet
            color="primary"
            height="42px"
            @click.stop="$router.push(`/tank/parameters/${tank.tankId}`)"
          >
            <v-card-actions>
              <v-spacer />
              <v-btn
                small
                depressed
                color="primary"
              >
                Details
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
import { localeDateString } from '~/dates'
export default {
  async fetch () {
    const { tanks } = await this.$axios.$get('/api/tank/list')
    for (const tank of tanks) {
      tank.dateStarted = localeDateString(tank.dateStarted)
    }
    this.tanks = tanks
  },
  data () {
    return {
      tanks: []
    }
  }
}
</script>
