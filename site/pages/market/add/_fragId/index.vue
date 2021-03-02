<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>Add "{{ frag.name }}" to the market</h1>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    const fragId = this.$route.params.fragId
    const { user, frag, fragsForSale } = await this.$axios.$get(`/api/market/frag/${fragId}`)
    this.user = user
    this.frag = frag
    this.fragsForSale = fragsForSale
  },

  data: () => ({
    user: {},
    frag: {},
    fragsForSale: []
  })
}
</script>
