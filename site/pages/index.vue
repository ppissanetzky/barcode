<template>
  <v-container fluid>
    <v-row>
      <v-dialog v-if="selectedFrag" v-model="fragDialog" max-width="375px">
        <bc-editable-frag-card :frag="selectedFrag" :user="user" />
      </v-dialog>
    </v-row>
    <v-row>
      <v-col>
        <h1>Your collection</h1>
      </v-col>
    </v-row>
    <!-- A prominent button to add a new item -->
    <v-row>
      <v-col>
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
        >
          <!-- Not needed for your collection -->
          <!-- <v-avatar
            v-if="frag.fragsAvailable + (frag.otherFragsAvailable || 0)"
            color="yellow accent-4"
            class="ma-1"
            size="24px"
            v-text="frag.fragsAvailable + (frag.otherFragsAvailable || 0)"
          /> -->
        </v-img>
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
    const { user, frags } = await this.$axios.$get('/api/dbtc/your-collection')
    const { yourCollectionView } = await this.$axios.$get('/api/user/settings')
    this.user = user
    this.frags = frags
    this.view = yourCollectionView || 'cards'
  },
  data () {
    return {
      user: {},
      frags: {},
      imports: [],
      selectedFrag: undefined,
      fragDialog: false,
      view: undefined
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
    }
  }
}
</script>
