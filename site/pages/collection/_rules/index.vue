<template>
  <v-container v-scroll="scroll" fluid>
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
              <v-text-field
                v-model="nameFilter"
                placeholder="Enter part of the name"
                clearable
                hide-details
                outlined
              />
            </v-card-actions>
            <v-card-actions>
              <v-autocomplete
                v-model="typeFilter"
                label="Type"
                :items="types"
                clearable
                outlined
                hide-details
              />
            </v-card-actions>
            <v-card-actions>
              <bc-user-autocomplete
                v-model="memberFilter"
                label="Member"
              />
            </v-card-actions>
            <v-card-actions>
              <v-btn color="secondary" @click="clearFilter">
                Clear
              </v-btn>
              <v-btn color="secondary" @click="applyFilter">
                Apply
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
    <v-row>
      <v-col v-if="filters" align-self="center" cols="auto">
        <v-chip v-if="filters.name" label close class="my-1 mr-1" @click:close="removeNameFilter">
          {{ nameFilter }}
        </v-chip>
        <v-chip v-if="filters.type" label close class="my-1 mr-1" @click:close="removeTypeFilter">
          {{ typeFilter }}
        </v-chip>
        <v-chip v-if="filters.member" label close class="my-1 mr-1" @click:close="removeMemberFilter">
          {{ filters.member.name }}
        </v-chip>
      </v-col>
      <v-col>
        <v-spacer />
      </v-col>
    </v-row>

    <!-- The cards of mothers -->
    <v-row>
      <v-col
        v-for="m in mothers"
        :key="m.motherId"
        cols="auto"
      >
        <bc-editable-frag-card
          :frag="m"
          :user="user"
          show-owner
        />
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcEditableFragCard from '~/components/BcEditableFragCard.vue'
import BcUserAutocomplete from '~/components/BcUserAutocomplete.vue'
export default {
  components: { BcEditableFragCard, BcUserAutocomplete },
  async fetch () {
    // Get the types in the background
    this.$axios.$get('/api/dbtc/enums').then(({ types }) => {
      this.types = types.map(({ type }) => type)
    })
    // Now wait for the next page
    await this.loadNextPage()
  },
  data () {
    return {
      user: {},
      mothers: [],
      types: [],

      lastPage: 0,
      loadingPage: false,
      allPagesLoaded: false,
      showFilter: false,
      filters: null,
      typeFilter: null,
      memberFilter: null,
      nameFilter: null
    }
  },
  methods: {
    async loadNextPage () {
      if (this.loadingPage || this.allPagesLoaded) {
        return
      }
      this.loadingPage = true
      try {
        const rules = this.$route.params.rules
        const page = ++this.lastPage
        const url = `/api/dbtc/collection/${encodeURIComponent(rules)}/p/${page}`
        const options = !this.filters ? {} : {
          params: {
            type: this.filters.type,
            name: this.filters.name ? `%${this.filters.name}%` : null,
            ownerId: this.filters.member ? this.filters.member.id : null
          }
        }
        const { user, mothers } = await this.$axios.$get(url, options)
        if (mothers.length === 0) {
          this.allPagesLoaded = true
          return
        }
        this.user = user
        this.mothers = this.mothers.concat(mothers)
        this.filteredMothers = this.mothers
      } finally {
        this.loadingPage = false
      }
    },
    scroll () {
      if (this.allPagesLoaded) {
        return
      }
      const bottomOfWindow = document.documentElement.scrollTop +
        window.innerHeight >= document.documentElement.offsetHeight - 300

      if (bottomOfWindow) {
        this.loadNextPage()
      }
    },
    removeNameFilter () {
      this.nameFilter = null
      this.applyFilter()
    },
    removeTypeFilter () {
      this.typeFilter = null
      this.applyFilter()
    },
    removeMemberFilter () {
      this.memberFilter = null
      this.applyFilter()
    },
    applyFilter () {
      this.allPagesLoaded = false
      this.lastPage = 0
      this.showFilter = false
      this.mothers = []
      if (this.nameFilter || this.typeFilter || this.memberFilter) {
        this.filters = {
          name: this.nameFilter,
          type: this.typeFilter,
          member: this.memberFilter
        }
      } else {
        this.filters = null
      }
      this.loadNextPage()
    },
    clearFilter () {
      this.showFilter = false
      if (!this.filters) {
        return
      }
      this.typeFilter = null
      this.memberFilter = null
      this.nameFilter = null
      this.filters = null
      this.allPagesLoaded = false
      this.lastPage = 0
      this.showFilter = false
      this.mothers = []
      this.loadNextPage()
    }
  }
}
</script>
