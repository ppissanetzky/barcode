<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card flat max-width="375px">
          <h1 v-if="frag" class="text-center" v-text="frag.name" />
          <h3 v-if="frag && !isOwner" class="text-center" v-text="frag.owner.name" />
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <bc-editable-frag-card
          :user="user"
          :frag="frag"
          :is-owner="isOwner"
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
    const { user, isOwner, frag, journals } = await this.$axios.$get(`/bc/api/dbtc/frag/${fragId}`)
    this.user = user
    this.isOwner = isOwner
    this.frag = frag
    this.journals = journals
    this.editedFragsAvailable = this.frag.fragsAvailable
  },

  data: () => ({
    user: undefined,
    isOwner: false,
    frag: undefined,
    journals: []
  })
}
</script>
