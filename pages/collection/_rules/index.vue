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
                  <bc-editable-frag-card :frag="m" :user="user">
                    <template v-slot:first-tabs>
                      <v-tab>
                        <v-icon>mdi-account-multiple-outline</v-icon>
                      </v-tab>
                    </template>
                    <template v-slot:first-tabs-items>
                      <v-tab-item>
                        <v-card-title>Owners and frags available</v-card-title>
                        <v-card-text v-if="!m.owners.length && m.isAlive">
                          Only <a :href="m.owner.viewUrl" target="_blank">{{ you(m.owner) }}</a>
                        </v-card-text>
                        <v-card-text v-else-if="!m.owners.length && !m.isAlive">
                          Only <a :href="m.owner.viewUrl" target="_blank">{{ you(m.owner) }}</a>, but it is dead
                        </v-card-text>
                        <v-card-text v-else>
                          <v-simple-table>
                            <tbody>
                              <tr
                                v-for="owner in m.owners"
                                :key="owner.ownerId"
                              >
                                <td>
                                  <a :href="owner.viewUrl" target="_blank">{{ you(owner, true) }}</a>
                                  {{ owner.location ? ' in ' + owner.location : '' }}
                                </td>
                                <td
                                  class="text-right"
                                >
                                  {{ owner.fragsAvailable }}
                                </td>
                              </tr>
                            </tbody>
                          </v-simple-table>
                        </v-card-text>
                        <v-card-text v-if="m.owners.length > 1">
                          <v-btn
                            small
                            color="secondary"
                            :to="`/kids/${m.motherId}`"
                          >
                            See all frags
                          </v-btn>
                        </v-card-text>
                      </v-tab-item>
                    </template>
                  </bc-editable-frag-card>
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
import BcEditableFragCard from '~/components/BcEditableFragCard.vue'
export default {
  components: { BcEditableFragCard },
  async fetch () {
    const rules = this.$route.params.rules
    const { user, mothers } = await this.$axios.$get(`/bc/api/dbtc/collection/${encodeURIComponent(rules)}`)

    this.user = user
    this.mothers = mothers
    this.filteredMothers = mothers

    const members = []
    mothers.forEach(({ owners, name, type }) => {
      owners.forEach(owner => members.push(owner))
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
          return mother.owners.some(({ ownerId }) => ownerId === this.memberFilter)
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
    },
    you (owner, caps) {
      if (owner.id === this.user.id) {
        return caps ? 'You' : 'you'
      }
      return owner.name
    }
  }
}
</script>
