<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card flat max-width="375px">
          <h1 v-if="frag" class="text-center" v-text="frag.name" />
          <h3 v-if="frag && !frag.ownsIt" class="text-center" v-text="frag.owner.name" />
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <bc-editable-frag-card
          v-if="frag"
          :user="user"
          :frag="frag"
          :journals="journals"
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
