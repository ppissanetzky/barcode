<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>Your collection</h1>
      </v-col>
    </v-row>
    <!-- A prominent button to add a new item -->
    <v-row>
      <v-col>
        <v-btn depressed color="primary" to="add-new-item">
          Add a new item
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <!-- A card for imports -->
      <v-col v-if="imports.length" cols="auto">
        <v-card width="375px">
          <v-img
            height="300px"
            src="/bc/import.jpg"
          />
          <v-card-title>They're waiting!</v-card-title>
          <v-card-subtitle>
            You have at least {{ imports.length }} DBTC thread{{ imports.length === 1 ? '' : 's' }} waiting to be imported.
          </v-card-subtitle>
          <v-card-text>
            <v-btn
              small
              color="secondary"
              to="/import"
            >
              Import one now
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- The cards of frags -->

      <v-col
        v-for="frag in frags"
        :key="frag.fragId"
        cols="auto"
      >
        <bc-editable-frag-card
          :frag="frag"
          :user="user"
          :is-owner="frag.ownerId === user.id"
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
    const { user, frags } = await this.$axios.$get('/bc/api/dbtc/your-collection')
    this.user = user
    this.frags = frags
    // Now, fetch the imports in the background
    this.$axios.$get('/bc/api/dbtc/imports').then(({ threads }) => {
      this.imports = threads
    })
  },
  data () {
    return {
      user: {},
      frags: {},
      imports: []
    }
  }
}
</script>
