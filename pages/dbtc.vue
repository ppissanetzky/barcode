<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>DBTC Collection</h1>
      </v-col>
    </v-row>

    <!-- The cards of mothers -->
    <v-row>
      <v-col>
        <v-container fluid>
          <v-data-iterator
            :items="filteredMothers"
          >

            <!-- Controls for filtering -->

            <template v-slot:header>
              <v-container fluid>
                <v-row>
                  <v-col cols="auto">
                    <v-autocomplete
                      v-model="typeFilter"
                      label="Type"
                      :items="['SPS', 'LPS', 'Softie', 'Other']"
                      clearable
                      hide-details
                      solo
                    />
                  </v-col>
                  <v-col cols="auto">
                    <v-autocomplete
                      v-model="memberFilter"
                      label="Member"
                      :items="members"
                      item-value="ownerId"
                      item-text="name"
                      clearable
                      hide-details
                      solo
                    />
                  </v-col>
                  <v-col cols="auto">
                    <v-autocomplete
                      v-model="nameFilter"
                      label="Name"
                      :items="names"
                      clearable
                      hide-details
                      solo
                    />
                  </v-col>
                  <v-col cols="auto">
                    <v-checkbox
                      v-model="haveFilter"
                      label="You don't have it"
                      hide-details
                    />
                  </v-col>
                  <v-col>
                    <v-spacer />
                  </v-col>
                </v-row>
              </v-container>
            </template>

            <template v-slot:default="{ items }">
              <v-row>
                <v-col
                  v-for="m in items"
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
            </template>
          </v-data-iterator>
        </v-container>
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
    this.filteredMothers = mothers

    const members = []
    mothers.forEach(({ haves, haveNots, name }) => {
      haves.forEach(owner => members.push(owner))
      haveNots.forEach(owner => members.push(owner))
      this.names.push(name)
    })
    members.sort((a, b) => {
      if (a.name < b.name) {
        return -1
      } else if (a.name > b.name) {
        return 1
      }
      return 0
    })
    this.members = members
  },
  data () {
    return {
      user: {},
      mothers: [],
      filteredMothers: [],
      members: [],
      names: [],

      typeFilter: '',
      memberFilter: '',
      haveFilter: false,
      nameFilter: ''
    }
  },

  methods: {
    filter () {
      this.filteredMothers = this.mothers.filter((mother) => {
        if (this.typeFilter) {
          if (mother.type !== this.typeFilter) {
            return false
          }
        }
        if (this.memberFilter) {
          return mother.haves.some(({ ownerId }) => ownerId === this.memberFilter) ||
            mother.haveNots.some(({ ownerId }) => ownerId === this.memberFilter)
        }
        if (this.haveFilter && mother.ownsIt) {
          return false
        }
        if (this.nameFilter) {
          return mother.name === this.nameFilter
        }
        return true
      })
    }
  },

  watch: {
    typeFilter () {
      this.filter()
    },
    memberFilter (value) {
      console.log(value)
      this.filter()
    },
    haveFilter () {
      this.filter()
    },
    nameFilter () {
      this.filter()
    }
  }
}
</script>
