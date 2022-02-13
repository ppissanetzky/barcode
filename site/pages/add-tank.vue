<template>
  <v-container fluid>
    <v-row>
      <v-col cols="auto">
        <v-card
          elevation="6"
          width="375px"
        >
          <v-card-title>Add a tank</v-card-title>
          <v-divider />
          <v-card-text>
            <div v-if="threads.length > 0">
              <p>If you already have a tank journal thread for this tank, select it below</p>
              <v-autocomplete
                v-model="threadId"
                label="Tank journal thread"
                :items="threads"
                clearable
                outlined
              />
            </div>
            <p>Give your tank a descriptive name</p>
            <v-text-field
              v-model="name"
              outlined
              :rules="[validateName]"
              label="Name"
            />
            <v-textarea
              v-model="description"
              outlined
              label="Description"
            />
            <p>If this is not a custom tank, enter the manufacturer's model, for example "RedSea Reefer 250"</p>
            <v-text-field
              v-model="model"
              outlined
              label="Model"
            />
            <p>The dimensions of the tank in inches (LxWxH), for example "48x24x20"</p>
            <v-text-field
              v-model="dimensions"
              outlined
              label="Dimensions"
              :rules="[validateDimensions]"
            />
            <p>The volume of the display in gallons</p>
            <v-text-field
              v-model="displayVolume"
              outlined
              label="Display volume"
              :rules="[validateDisplayVolume]"
            />
            <p>The total volume of the system in gallons, including the sump</p>
            <v-text-field
              v-model="totalVolume"
              outlined
              label="Total system volume"
              :rules="[validateTotalVolume]"
            />
            <p>The date the tank was started</p>
            <bc-date-picker
              v-model="dateStarted"
              label="Date started"
            />
          </v-card-text>
          <v-card-text>
            <v-btn
              color="primary"
              :disabled="!valid"
              :loading="submitting"
              @click.stop="submit"
            >
              Submit
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcDatePicker from '../components/BcDatePicker.vue'
import { utcIsoStringFromString } from '~/dates'
const DIM_RX = /^\d+x\d+x\d+$/
export default {
  components: { BcDatePicker },
  async fetch () {
    const { threads } = await this.$axios.$get('/api/tank/add-info')
    this.threads = threads.map(({ threadId, title }) =>
      ({ value: threadId, text: title }))
  },
  data () {
    return {
      threads: [],
      name: undefined,
      model: undefined,
      dimensions: undefined,
      displayVolume: undefined,
      totalVolume: undefined,
      dateStarted: undefined,
      description: undefined,
      submitting: false
    }
  },
  computed: {
    valid () {
      return this.validateName(this.name) === true &&
        this.validateDisplayVolume(this.displayVolume) === true &&
        this.validateTotalVolume(this.totalVolume) === true &&
        this.validateDimensions(this.dimensions) === true
    }
  },
  methods: {
    validateName (value) {
      if (!value) {
        return 'The tank name is required'
      }
      return true
    },
    validateDisplayVolume (value) {
      if (!value) {
        return 'The display volume is required'
      }
      const volume = parseInt(value, 10)
      if (isNaN(volume)) {
        return 'The display volume must be a number'
      }
      if (volume <= 0) {
        return 'Must be greater than 0'
      }
      return true
    },
    validateTotalVolume (value) {
      if (!value) {
        return 'The total volume is required'
      }
      const volume = parseInt(value, 10)
      if (isNaN(volume)) {
        return 'The total volume must be a number'
      }
      if (volume <= 0) {
        return 'Must be greater than 0'
      }
      if (this.displayVolume) {
        const displayVolume = parseInt(this.displayVolume, 10)
        if (!isNaN(displayVolume) && displayVolume > volume) {
          return 'The total volume must be greater than or equal to the display volume'
        }
      }
      return true
    },
    validateDimensions (value) {
      if (value && !DIM_RX.test(value)) {
        return 'Dimensions mut be in the form "LxWxH"'
      }
      return true
    },
    async submit () {
      this.submitting = true
      const formData = new FormData()
      function set (key, value) {
        if (value) {
          formData.set(key, value)
        }
      }
      set('name', this.name)
      set('model', this.model)
      set('dimensions', this.dimensions)
      set('displayVolume', this.displayVolume)
      set('totalVolume', this.totalVolume)
      set('dateStarted', utcIsoStringFromString(this.dateStarted))
      set('description', this.description)
      set('threadId', this.threadId)
      const { tankId } = await this.$axios.$post('/api/tank/add', formData)
      this.submitting = false
      this.$router.replace(`/tank/${tankId}`)
    }
  }
}
</script>
