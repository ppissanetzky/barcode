<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>{{ this.$route.params.rules.toUpperCase() }} Collection</h1>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="auto">
        <v-dialog
          v-model="showFilter"
          max-width="375px"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="primary"
              v-bind="attrs"
              v-on="on"
            >
              <v-icon left>
                mdi-tune-vertical
              </v-icon>
              Filter
            </v-btn>
          </template>

          <v-card>
            <v-card-title>Filter</v-card-title>
            <v-card-actions>
              <v-autocomplete
                v-model="typeFilter"
                label="Type"
                :items="types"
                clearable
                hide-details
                solo
              />
            </v-card-actions>
            <v-card-actions>
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
            </v-card-actions>
            <v-card-actions>
              <v-checkbox
                v-model="haveFilter"
                label="You don't have it"
                hide-details
              />
              <v-spacer />
              <v-checkbox
                v-model="availableFilter"
                label="Is available"
                hide-details
              />
            </v-card-actions>
            <v-card-actions>
              <v-btn color="secondary" @click="clearFilter">
                Clear
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
      <v-col cols="auto">
        <v-autocomplete
          v-model="nameFilter"
          placeholder="Type to search by name"
          :items="names"
          clearable
          hide-details
          outlined
          dense
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col align-self="center" cols="auto">
        <v-chip v-if="typeFilter" label close class="my-1 mr-1" @click:close="typeFilter=''">
          {{ typeFilter }}
        </v-chip>
        <v-chip v-if="memberFilter" label close class="my-1 mr-1" @click:close="memberFilter=''">
          {{ memberFilterName }}
        </v-chip>
        <v-chip v-if="haveFilter" label close class="my-1 mr-1" @click:close="haveFilter=false">
          You don't have it
        </v-chip>
        <v-chip v-if="availableFilter" label close class="my-1 mr-1" @click:close="availableFilter=false">
          Is available
        </v-chip>
      </v-col>
      <v-col>
        <v-spacer />
      </v-col>
    </v-row>

    <!-- The cards of mothers -->
    <v-row>
      <v-col
        v-for="m in filteredMothers"
        :key="m.motherId"
        cols="auto"
      >
        <bc-editable-frag-card
          :frag="m"
          :user="user"
          show-owner
        >
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
  </v-container>
</template>
<script>
import BcEditableFragCard from '~/components/BcEditableFragCard.vue'
const compare = (a, b) => {
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la < lb) {
    return -1
  }
  if (la > lb) {
    return 1
  }
  return 0
}
export default {
  components: { BcEditableFragCard },
  async fetch () {
    const rules = this.$route.params.rules
    const { user, mothers } = await this.$axios.$get(`/api/dbtc/collection/${encodeURIComponent(rules)}`)

    this.user = user
    this.mothers = mothers
    this.filteredMothers = mothers

    const members = []
    mothers.forEach(({ owners, name, type }) => {
      owners.forEach(owner => members.push(owner))
      this.types.push(type)
    })
    members.sort((a, b) => compare(a.name, b.name))
    this.types.sort(compare)
    this.members = members
  },
  data () {
    return {
      user: {},
      mothers: [],
      filteredMothers: [],
      members: [],
      types: [],

      showFilter: false,
      typeFilter: '',
      memberFilter: '',
      haveFilter: false,
      nameFilter: '',
      availableFilter: false
    }
  },
  computed: {
    memberFilterName () {
      let result = ''
      if (this.memberFilter) {
        // const filterId = parseInt(this.memberFilter, 10)
        this.members.some(({ id, name }) => {
          if (id === this.memberFilter) {
            result = name
            return true
          }
        })
      }
      return result
    },
    names () {
      return this.filteredMothers.map(({ name }) => name).sort(compare)
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
    clearFilter () {
      this.typeFilter = ''
      this.memberFilter = ''
      this.haveFilter = false
      this.nameFilter = ''
      this.availableFilter = false
      this.showFilter = false
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
