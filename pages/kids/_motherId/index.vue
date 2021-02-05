<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>All frags of {{ name }}</h1>
      </v-col>
    </v-row>

    <!-- The cards of mothers -->
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
        >
          <template v-slot:first-tabs>
            <v-tab>
              <v-icon>mdi-account-outline</v-icon>
            </v-tab>
          </template>
          <template v-slot:first-tabs-items>
            <v-tab-item>
              <v-card-title
                v-if="frag.ownsIt"
              >
                Owned by you
              </v-card-title>
              <v-card-title
                v-else
              >
                Owned by {{ frag.owner.name }}
              </v-card-title>
            </v-tab-item>
          </template>
        </bc-editable-frag-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcEditableFragCard from '~/components/BcEditableFragCard.vue'
export default {
  components: { BcEditableFragCard },
  async fetch () {
    const motherId = this.$route.params.motherId
    const { user, frags } = await this.$axios.$get(`/bc/api/dbtc/kids/${encodeURIComponent(motherId)}`)
    this.user = user
    this.frags = frags
  },
  data () {
    return {
      user: {},
      frags: []
    }
  },
  computed: {
    name () {
      const [first] = this.frags
      return first ? first.name : ''
    }
  }
}
</script>
