<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-btn>
          click
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <bc-user-autocomplete
          v-model="user"
          label="Recipient"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <bc-date-picker
          v-model="myDate"
          label="Choose a date, fool"
          hint="do it"
          name="date"
        />
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
      user: undefined,
      myDate: undefined
    }
  },
  watch: {
    myDate (value) {
      // console.warn('DATE IS', this.myDate)
    }
  }
}
</script>
