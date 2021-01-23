<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>{{ this.$route.params.rules.toUpperCase() }} Collection</h1>
      </v-col>
    </v-row>

    <!-- The cards of mothers -->
    <v-row>
      <v-col>
        <v-container fluid>
          <v-data-iterator :items="filteredMothers">
            <!-- Controls for filtering -->

            <template v-slot:header>
              <v-container fluid>
                <v-row>
                  <v-col cols="auto">
                    <v-autocomplete
                      v-model="typeFilter"
                      label="Type"
                      :items="types"
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
                  <v-col cols="auto">
                    <v-checkbox
                      v-model="availableFilter"
                      label="Is available"
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
                  <bc-frag-card :frag-or-mother="m" :user="user">
                    <template>
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
                    </template>
                  </bc-frag-card>
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
import BcFragCard from '~/components/BcFragCard.vue'
export default {
  components: { BcFragCard },
  async fetch () {
    const rules = this.$route.params.rules
    const { user, mothers } = await this.$axios.$get(`/bc/api/dbtc/collection/${encodeURIComponent(rules)}`)

    this.user = user
    this.mothers = mothers
    this.filteredMothers = mothers

    const members = []
    mothers.forEach(({ haves, haveNots, name, type }) => {
      haves.forEach(owner => members.push(owner))
      haveNots.forEach(owner => members.push(owner))
      this.names.push(name)
      this.types.push(type)
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
      types: [],

      typeFilter: '',
      memberFilter: '',
      haveFilter: false,
      nameFilter: '',
      availableFilter: false
    }
  },
  watch: {
    typeFilter () {
      this.filter()
    },
    memberFilter (value) {
      this.filter()
    },
    haveFilter () {
      this.filter()
    },
    nameFilter () {
      this.filter()
    },
    availableFilter () {
      this.filter()
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
        if (this.availableFilter) {
          return mother.fragsAvailable > 0
        }
        return true
      })
    }
  }
}
</script>
