<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>DBTC Collection</h1>
      </v-col>
    </v-row>

    <!-- Controls for filtering -->

    <v-row>
      <v-col cols="auto">
        <v-select
          v-model="typeFilter"
          label="Type"
          :items="['All', 'SPS', 'LPS', 'Softie', 'Other']"
          solo
          hide-details="auto"
        />
      </v-col>
      <v-col cols="auto">
        <v-select
          v-model="memberFilter"
          label="Member"
          :items="members"
          item-value="ownerId"
          item-text="name"
          return-object
          solo
          hide-details="auto"
        />
      </v-col>
    </v-row>

    <!-- The cards of mothers -->
    <v-row>
      <v-col
        v-for="m in mothers"
        :key="m.motherId"
        cols="auto"
      >
        <v-card max-width="375">
          <v-carousel
            :show-arrows="m.pictures.length > 1"
            :hide-delimiters="m.pictures.length < 2"
            show-arrows-on-hover
            height="300"
          >
            <v-carousel-item
              v-for="(item,i) in m.pictures"
              :key="i"
              :src="`${$config.BC_UPLOADS_URL}/${item}`"
            />
          </v-carousel>
          <v-card-title v-text="m.name" />
          <v-card-subtitle v-text="m.scientificName" />
          <v-card-text>
            <v-chip label v-text="m.type" />
            <v-chip
              v-if="m.ownsIt"
              label
              color="warning"
            >
              You have it
            </v-chip>
          </v-card-text>

          <v-simple-table dense>
            <template v-slot:default>
              <thead>
                <tr>
                  <th class="text-center">Light</th>
                  <th class="text-center">Flow</th>
                  <th class="text-center">Hardiness</th>
                  <th class="text-center">Growth rate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center">{{ m.light.toLowerCase() }}</td>
                  <td class="text-center">{{ m.flow.toLowerCase() }}</td>
                  <td class="text-center">{{ m.hardiness.toLowerCase() }}</td>
                  <td class="text-center">{{ m.growthRate.toLowerCase() }}</td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>

          <div v-if="m.haves.length">
            <v-divider />
            <v-list>
              <v-card-title>These members have frags</v-card-title>
              <v-list-item
                v-for="owner in m.haves"
                :key="owner.ownerId"
              >
                <v-list-item-avatar>
                  <v-img
                    v-if="owner.avatarUrl"
                    :src="owner.avatarUrl"
                  />
                  <v-icon
                    v-else
                    size="48px"
                  >
                    mdi-account-circle
                  </v-icon>
                </v-list-item-avatar>

                <v-list-item-content>
                  <v-list-item-title>
                    <a :href="owner.viewUrl" target="_blank">{{ owner.name }}</a>
                    {{ owner.fragsAvailable ? ' has ' + owner.fragsAvailable : 'doesn\'t have any frags' }}
                    {{ owner.location && owner.fragsAvailable ? ' in ' + owner.location : '' }}
                  </v-list-item-title>
                </v-list-item-content>

                <v-list-item-action>
                  <v-btn icon :to="'/frag/' + owner.fragId">
                    <v-icon>mdi-information</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
          </div>

          <div v-if="m.haveNots.length">
            <v-divider />
            <v-list>
              <v-card-subtitle>These members don't have frags right now</v-card-subtitle>
              <v-list-item
                v-for="owner in m.haveNots"
                :key="owner.ownerId"
              >
                <v-list-item-avatar>
                  <v-img
                    v-if="owner.avatarUrl"
                    :src="owner.avatarUrl"
                  />
                  <v-icon
                    v-else
                    size="48px"
                  >
                    mdi-account-circle
                  </v-icon>
                </v-list-item-avatar>

                <v-list-item-content>
                  <v-list-item-title>
                    <a :href="owner.viewUrl" target="_blank">{{ owner.name }}</a>
                    {{ owner.location ? ' in ' + owner.location : '' }}
                  </v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn icon :to="'/frag/' + owner.fragId">
                    <v-icon>mdi-information</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    const { user, mothers } = await this.$axios.$get('/bc/api/dbtc/mothers')

    this.user = user
    this.mothers = mothers

    this.members.push({ ownerId: 0, name: 'All' })
    mothers.forEach(({ haves, haveNots }) => {
      haves.forEach(owner => this.members.push(owner))
      haveNots.forEach(owner => this.members.push(owner))
    })
  },
  data () {
    return {
      user: {},
      mothers: [],
      members: [],

      typeFilter: undefined,
      memberFilter: undefined
    }
  },

  watch: {
    typeFilter (value) {
      console.log(value)
    }
  }
}
</script>
