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
        >
          <v-card-title v-text="tank.name" />
          <v-card-subtitle>
            <div v-if="tank.thread">
              <v-chip
                small
                label
                color="#1f63a6"
                class="white--text my-1 mr-1"
                :href="tank.thread.viewUrl"
                target="_blank"
              >
                Thread
                <v-icon small right>
                  mdi-open-in-new
                </v-icon>
              </v-chip>
            </div>
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
          <v-card-text v-if="tank.parameters.length > 0">
            <v-container fluid>
              <v-row>
                <v-col
                  v-for="p in tank.parameters"
                  :key="p.name"
                  cols="auto"
                >
                  <v-card
                    :color="p.color"
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
          </v-card-text>
          <v-divider />
          <v-card-text>
            <v-btn text :to="`/tank/${tank.tankId}/parameters`">
              {{ 'Notes & parameters' }}
              <v-icon right>
                mdi-chevron-double-right
              </v-icon>
            </v-btn>
            <v-btn v-if="tank.thread" text :to="`/tank/${tank.tankId}/pictures`">
              Pictures
              <v-icon right>
                mdi-chevron-double-right
              </v-icon>
            </v-btn>
            <v-btn text :to="`/tank/${tank.tankId}/livestock`">
              Livestock
              <v-icon right>
                mdi-chevron-double-right
              </v-icon>
            </v-btn>
          </v-card-text>
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
