<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card flat width="375px">
          <h1 class="text-center">
            {{ me ? 'Your DBTC Stats' : 'DBTC Member Stats' }}
          </h1>
          <h2 v-if="!me" class="text-center">
            {{ user.name }}
          </h2>
          <bc-user-autocomplete v-model="selectedUser" />
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <!-- A card for contributed items -->
      <v-col cols="auto">
        <v-card width="375px" :loading="loading">
          <v-card-title>Contributed</v-card-title>
          <v-card-text v-if="!contributed.length">
            Nothing
          </v-card-text>
          <v-card-text v-else>
            <div v-for="c in contributed" :key="c.type">
              <h3>{{ c.count }} {{ c.type }}</h3>
              <v-simple-table dense>
                <template v-slot:default>
                  <tbody>
                    <tr v-for="f in c.frags" :key="f.fragId">
                      <td class="text-left">
                        <router-link :to="`/frag/${f.fragId}`">
                          {{ f.name }}
                        </router-link>
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-simple-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- A card for links -->
      <v-col cols="auto">
        <v-card width="375px" :loading="loading">
          <v-card-title>Links</v-card-title>
          <v-card-text v-if="!links.length">
            None
          </v-card-text>
          <v-card-text v-else>
            <div v-for="l in links" :key="l.type">
              <h3>{{ l.count ? l.count : 'No' }} {{ l.type }}</h3>
              <v-simple-table dense>
                <template v-slot:default>
                  <tbody>
                    <tr v-for="m in l.mothers" :key="m.motherId">
                      <td class="text-left">
                        <router-link :to="`/kids/${m.motherId}`">
                          {{ m.name }}
                        </router-link>
                      </td>
                      <td class="text-right">
                        {{ m.count || '-' }}
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-simple-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcUserAutocomplete from '../../components/BcUserAutocomplete.vue'
export default {
  components: { BcUserAutocomplete },
  async fetch () {
    const userId = this.$route.params.userId || 'me'
    await this.loadForUserId(userId)
  },
  data () {
    return {
      user: {},
      contributed: [],
      links: [],
      selectedUser: undefined,
      loading: false,
      me: true
    }
  },
  watch: {
    selectedUser (value) {
      this.loadForUserId(value
        ? value.id
        : this.$route.params.userId || 'me')
    }
  },
  methods: {
    async loadForUserId (userId) {
      this.loading = true
      this.user = {}
      this.contributed = []
      this.links = []
      this.me = userId === 'me'
      const url = `/api/dbtc/user-stats/${userId}`
      const { user, contributed, links } = await this.$axios.$get(url)
      this.user = user
      this.contributed = contributed
      this.links = links
      this.loading = false
    }
  }
}
</script>
