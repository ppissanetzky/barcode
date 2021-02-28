<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card width="375px">
          <h1 class="text-center">
            Member lookup
          </h1>
          <v-card-actions>
            <bc-user-autocomplete v-model="selectedUser" allow-all />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcUserAutocomplete from '~/components/BcUserAutocomplete.vue'
export default {
  components: { BcUserAutocomplete },
  data () {
    return {
      selectedUser: undefined
    }
  },
  watch: {
    selectedUser (value) {
      if (value) {
        this.$router.push(`/member/${value.id}`)
      }
    }
  }
}
</script>
