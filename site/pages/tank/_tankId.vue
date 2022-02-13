<template>
  <v-container fluid>
    <v-row>
      <v-col cols="auto">
        <v-card
          v-if="tank"
          elevation="6"
          width="375px"
        >
          <v-card-title v-text="tank.name" />
          <v-card-subtitle>
            <div v-if="tank.model">
              {{ tank.model }}
            </div>
            <div>
              {{ tank.displayVolume }}g display / {{ tank.totalVolume }}g total
              <span v-if="tank.dimensions"> / {{ tank.dimensions }} </span>
            </div>
            <div>
              Started {{ tank.dateStarted }}, {{ tank.age }}
            </div>
          </v-card-subtitle>
          <v-card-text v-if="tank.description">
            {{ tank.description }}
          </v-card-text>
          <v-divider />
          <v-card-text>
            <v-chip
              v-for="(jt, index) in displayJournalTypes"
              :key="index"
              :color="jt.color"
              small
              label
              class="ma-1"
              @click.stop="showJournalEntry(jt)"
            >
              {{ jt.label }}
            </v-chip>
            <!-- An area to add a note -->
            <v-form ref="form" v-model="journalValid" :disabled="journalSubmitting">
              <div
                v-if="selectedJournalType"
                class="ma-2"
              >
                <div
                  v-if="selectedJournalType.value"
                >
                  <v-text-field
                    v-model="journalValue"
                    outlined
                    :label="selectedJournalType.unit || 'Value'"
                    :rules="[validateJournalValue]"
                  />
                </div>
                <v-text-field
                  v-model="journalNote"
                  outlined
                  label="Comment"
                  :rules="[validateJournalNote]"
                />
                <bc-date-picker
                  v-model="journalDate"
                  label="Date"
                />
                <v-card-actions>
                  <v-spacer />
                  <v-btn
                    small
                    color="secondary"
                    @click="selectedJournalType = undefined"
                  >
                    Cancel
                  </v-btn>
                  <v-btn
                    small
                    color="primary"
                    :disabled="!journalValid"
                    :loading="journalSubmitting"
                    @click="submitJournal"
                  >
                    Submit
                  </v-btn>
                </v-card-actions>
              </div>
            </v-form>
          </v-card-text>
          <v-divider />
          <div v-if="tank.parameters.length > 0">
            <v-card-subtitle>Latest parameters</v-card-subtitle>
            <v-card-text>
              <v-simple-table>
                <tbody>
                  <tr
                    v-for="p in tank.parameters"
                    :key="p.name"
                  >
                    <td
                      class="text-left"
                    >
                      {{ p.abbreviation }}
                    </td>
                    <td
                      class="text-right"
                    >
                      <strong>{{ p.text }}</strong>
                    </td>
                    <td
                      class="text-left"
                    >
                      {{ p.units }}
                    </td>
                    <td
                      class="text-left"
                    >
                      {{ p.age }}
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card-text>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import formatISO from 'date-fns/formatISO'
import { localeDateString, utcIsoStringFromString } from '~/dates'
export default {
  async fetch () {
    const tankId = this.$route.params.tankId
    const url = `/api/tank/${tankId}`
    const { tank, journalTypes } = await this.$axios.$get(url)
    tank.dateStarted = localeDateString(tank.dateStarted)
    this.tank = tank
    this.journalTypes = journalTypes
  },
  data () {
    return {
      tank: undefined,
      journalTypes: undefined,
      selectedJournalType: undefined,
      // Models when making a journal entry
      journalValid: undefined,
      journalNote: undefined,
      journalValue: undefined,
      journalDate: undefined,
      journalSubmitting: undefined
    }
  },
  computed: {
    displayJournalTypes () {
      return this.journalTypes.filter(jt =>
        !this.selectedJournalType || this.selectedJournalType === jt)
    }
  },
  methods: {
    showJournalEntry (jt) {
      this.journalValid = undefined
      this.journalNote = undefined
      this.journalValue = undefined
      this.journalDate = undefined
      this.journalSubmitting = undefined
      this.$refs.form.resetValidation()
      this.selectedJournalType = jt
    },
    validateJournalValue (value) {
      if (!value) {
        return 'A value is required'
      }
      const float = parseFloat(value)
      if (isNaN(float) || float < 0) {
        return 'This must be a number greater than 0'
      }
      return true
    },
    validateJournalNote (value) {
      if (this.selectedJournalType.value) {
        return true
      }
      if (!value) {
        return 'A comment is required'
      }
      return true
    },
    async submitJournal () {
      this.journalSubmitting = true
      const formData = new FormData()
      function set (key, value) {
        if (value) {
          formData.set(key, value)
        }
      }
      set('tankId', this.tank.tankId)
      set('type', this.selectedJournalType.type)
      set('subType', this.selectedJournalType.subType)
      set('value', this.journalValue)
      set('note', this.journalNote)
      // If the user did not change the date from 'now', we don't send
      // it. That way, the timestamp will be empty and will be set to
      // the current date time server-side. Otherwise, we send it as just
      // the date since we don't know the time.
      const today = formatISO(new Date(), { representation: 'date' })
      if (this.journalDate !== today) {
        set('timestamp', utcIsoStringFromString(this.journalDate))
      }
      const { parameters } = await this.$axios.$post('/api/tank/journal', formData)
      this.journalSubmitting = false
      this.selectedJournalType = undefined
      this.tank.parameters = parameters
    }
  }
}
</script>
