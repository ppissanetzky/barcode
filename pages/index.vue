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

    <!-- The cards of frags -->
    <v-row>
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
  },
  data () {
    return {
      user: {},
      frags: {}
    }
  }
}
</script>
