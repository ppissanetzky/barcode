<template>
  <v-container fluid>
    <v-row>
      <!-- A popup frag card dialog that shows up when you click
      on an item in gallery view -->
      <v-dialog v-if="selectedFrag" v-model="fragDialog" max-width="375px">
        <bc-editable-frag-card :frag="selectedFrag" :user="user" />
      </v-dialog>

      <!-- Filter dialog -->
      <v-dialog
        v-model="showFilter"
        max-width="375px"
      >
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
            <v-autocomplete
              v-model="collectionFilter"
              label="Collection"
              :items="['DBTC', 'PIF', 'PRIVATE']"
              clearable
              outlined
              hide-details
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
    </v-row>
    <v-row>
      <v-col>
        <h1>Your collection</h1>
      </v-col>
    </v-row>
    <!-- A prominent button to add a new item -->
    <v-row>
      <v-col cols="auto">
        <v-btn color="primary" @click.stop="showFilter = true">
          <v-icon left>
            mdi-tune-vertical
          </v-icon>
          Filter
        </v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn color="primary" to="add-new-item">
          Add a new item
        </v-btn>
      </v-col>
      <v-col cols="auto">
        <v-btn-toggle v-if="view" v-model="view" mandatory dense>
          <v-btn value="cards">
            <v-icon>mdi-card-text-outline</v-icon>
          </v-btn>
          <v-btn value="gallery">
            <v-icon>mdi-view-grid-outline</v-icon>
          </v-btn>
        </v-btn-toggle>
        <v-spacer />
      </v-col>
    </v-row>

    <v-row>
      <v-col v-if="filters" align-self="center" cols="auto">
        <v-chip v-if="filters.name" label close class="my-1 mr-1" @click:close="removeNameFilter">
          {{ filters.name }}
        </v-chip>
        <v-chip v-if="filters.type" label close class="my-1 mr-1" @click:close="removeTypeFilter">
          {{ filters.type }}
        </v-chip>
        <v-chip v-if="filters.collection" label close class="my-1 mr-1" @click:close="removeCollectionFilter">
          {{ filters.collection }}
        </v-chip>
      </v-col>
      <v-col>
        <v-spacer />
      </v-col>
    </v-row>

    <v-row v-if="view === 'gallery'" no-gutters>
      <v-col
        v-for="frag in frags"
        :key="frag.fragId"
        cols="4"
      >
        <v-img
          aspect-ratio="1"
          :src="frag.picture ? `/bc/uploads/${frag.picture}` : `/bc/picture-placeholder.png`"
          class="ma-1"
          @click.stop="showFragDialog(frag)"
        />
      </v-col>
    </v-row>

    <v-row v-else>
      <!-- The cards of frags -->
      <v-col
        v-for="frag in frags"
        :key="frag.fragId"
        cols="auto"
      >
        <bc-editable-frag-card
          :frag="frag"
          :user="user"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcEditableFragCard from '~/components/BcEditableFragCard.vue'

export default {
  components: { BcEditableFragCard },
  async fetch () {
    // Get the types in the background
    this.$axios.$get('/api/dbtc/enums').then(({ types }) => {
      this.types = types.map(({ type }) => type)
    })
    const { user, frags } = await this.$axios.$get('/api/dbtc/your-collection')
    const { yourCollectionView } = await this.$axios.$get('/api/user/settings')
    this.user = user
    this.frags = frags
    this.originalFrags = frags
    this.view = yourCollectionView || 'cards'
  },
  data () {
    return {
      user: {},
      originalFrags: [],
      frags: [],
      imports: [],
      selectedFrag: undefined,
      fragDialog: false,
      view: undefined,
      // For filtering
      filters: undefined,
      types: [],
      showFilter: false,
      nameFilter: undefined,
      typeFilter: undefined,
      collectionFilter: undefined
    }
  },
  watch: {
    fragDialog (value) {
      if (!value) {
        this.selectedFrag = undefined
      }
    },
    view (value) {
      if (value) {
        const url = `/api/user/settings/yourCollectionView/${encodeURIComponent(value)}`
        this.$axios.$put(url)
      }
    }
  },
  methods: {
    showFragDialog (frag) {
      this.selectedFrag = frag
      this.fragDialog = true
    },
    removeNameFilter () {
      this.nameFilter = undefined
      this.applyFilter()
    },
    removeTypeFilter () {
      this.typeFilter = undefined
      this.applyFilter()
    },
    removeCollectionFilter () {
      this.collectionFilter = undefined
      this.applyFilter()
    },
    clearFilter () {
      this.nameFilter = undefined
      this.typeFilter = undefined
      this.collectionFilter = undefined
      this.filters = undefined
      this.showFilter = false
      this.frags = this.originalFrags
    },
    applyFilter () {
      this.showFilter = false
      if (this.nameFilter || this.typeFilter || this.collectionFilter) {
        this.filters = {
          name: this.nameFilter,
          type: this.typeFilter,
          collection: this.collectionFilter
        }
      } else {
        this.filters = undefined
        this.frags = this.originalFrags
        return
      }
      this.frags = this.originalFrags.filter((frag) => {
        if (this.nameFilter && !frag.name.toLowerCase().includes(this.nameFilter.toLowerCase())) {
          return false
        }
        if (this.typeFilter && frag.type !== this.typeFilter) {
          return false
        }
        if (this.collectionFilter && frag.rules.toUpperCase() !== this.collectionFilter) {
          return false
        }
        return true
      })
    }
  }
}
</script>
