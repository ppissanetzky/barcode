<template>
  <v-menu
    ref="menu"
    v-model="menu"
    :close-on-content-click="false"
    :return-value.sync="theDate"
    transition="scale-transition"
    offset-y
    min-width="290px"
  >
    <template v-slot:activator="{ on, attrs }">
      <validation-provider
        v-slot="{ errors }"
        :rules="rules"
        :name="name"
      >
        <v-text-field
          v-model="theDate"
          :label="label"
          v-bind="attrs"
          :hint="hint"
          persistent-hint
          :error-messages="errors"
          readonly
          required
          outlined
          hide-details
          v-on="on"
        />
      </validation-provider>
    </template>
    <v-date-picker
      v-model="theDate"
      :max="today"
      no-title
      scrollable
    >
      <v-spacer />
      <v-btn
        text
        color="primary"
        @click="menu = false"
      >
        Cancel
      </v-btn>
      <v-btn
        text
        color="primary"
        @click="save"
      >
        OK
      </v-btn>
    </v-date-picker>
  </v-menu>
</template>
<script>
import { ValidationProvider } from 'vee-validate/dist/vee-validate.full.esm'
import formatISO from 'date-fns/formatISO'

// Today's date time converted to local and stripped of its time
const today = formatISO(new Date(), { representation: 'date' })

export default {

  components: {
    ValidationProvider
  },

  props: {
    label: {
      type: String,
      default: undefined
    },
    name: {
      type: String,
      default: undefined
    },
    hint: {
      type: String,
      default: undefined
    },
    rules: {
      type: String,
      default: 'required|length:10'
    },
    // This is for v-model support
    value: {
      type: String,
      default: today
    }
  },

  data () {
    return {
      theDate: this.value,
      // To initialize the date and max dates on the date picker
      today,
      // The date picker menu
      menu: false
    }
  },

  watch: {
    value (val) {
      this.theDate = val
    }
  },

  created () {
    // Since we may have defaulted the selected date to today, we
    // emit this event so the outside world's v-model is updated to
    // reflect it
    this.$emit('input', this.theDate)
  },

  methods: {
    save () {
      this.$refs.menu.save(this.theDate)
      // Updates v-model
      this.$emit('input', this.theDate)
    }
  }
}
</script>
