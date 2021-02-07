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
    const shareId = this.$route.params.shareId
    const { frag, journals } = await this.$axios.$get(`/api/public/shared/${encodeURIComponent(shareId)}`)
    this.user = {}
    this.frag = frag
    this.journals = journals
  },

  data: () => ({
    user: undefined,
    frag: undefined,
    journals: []
  })
}
</script>
