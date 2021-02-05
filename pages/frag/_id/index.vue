<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <bc-editable-frag-card
          v-if="frag"
          :user="user"
          :frag="frag"
          :journals="journals"
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
    const fragId = this.$route.params.id
    const { user, frag, journals } = await this.$axios.$get(`/bc/api/dbtc/frag/${fragId}`)
    this.user = user
    this.frag = frag
    this.journals = journals
    this.editedFragsAvailable = this.frag.fragsAvailable
  },

  data: () => ({
    user: undefined,
    frag: undefined,
    journals: []
  })
}
</script>
