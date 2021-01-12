<template>
  <h1 v-if="frag" v-text="frag.name" />
</template>
<script>
export default {
  async fetch () {
    const fragId = this.$route.params.id
    const { user, isOwner, frag } = await this.$axios.$get(`/bc/api/dbtc/frag/${fragId}`)
    this.user = user
    this.isOwner = isOwner
    this.frag = frag
  },
  data () {
    return {
      user: null,
      isOwner: null,
      frag: null
    }
  }
}
</script>
