<template>
  <v-container fluid>
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
          show-owner
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
    const fragIds = this.$route.params.fragIds.split(',')
    const options = {
      headers: {
        'content-type': 'application/json'
      },
      data: {
        fragIds
      }
    }
    const { user, frags } = await this.$axios.$post('/api/dbtc/frags', options)
    this.user = user
    this.frags = frags
  },
  data () {
    return {
      user: {},
      frags: []
    }
  }
}
</script>
