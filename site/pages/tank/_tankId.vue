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
              {{ jt.name }}
            </v-chip>
            <!-- An area to add a note -->
            <v-form ref="form" v-model="journalValid" :disabled="journalSubmitting">
              <div
                v-if="selectedJournalType"
                class="ma-2"
              >
                <div
                  v-if="selectedJournalType.hasValue"
                >
                  <v-text-field
                    v-model="journalValue"
                    outlined
                    :label="selectedJournalType.units || 'Value'"
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
          <!-- Latest parameters -->
          <div v-if="tank.parameters.length > 0">
            <v-divider />
            <v-card-subtitle>Latest parameters</v-card-subtitle>
            <v-card-text @click="gotoParameters">
              <v-simple-table>
                <tbody>
                  <tr
                    v-for="p in tank.parameters"
                    :key="p.name"
                  >
                    <td
                      class="text-left"
                    >
                      {{ p.name }}
                    </td>
                    <td
                      class="text-right"
                    >
                      <strong>{{ p.text }}</strong>
                    </td>
                    <td
                      class="text-right"
                    >
                      {{ p.age }}
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card-text>
          </div>
          <!-- Latest notes -->
          <div v-if="tank.notes.length > 0">
            <v-divider />
            <v-card-subtitle>Latest notes</v-card-subtitle>
            <v-card-text @click="gotoParameters">
              <v-simple-table>
                <tbody>
                  <tr
                    v-for="n in tank.notes"
                    :key="n.name"
                  >
                    <td>
                      <strong>{{ n.name }}</strong>
                      <br>
                      {{ n.text }}
                    </td>
                    <td>
                      {{ n.age }}
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card-text>
          </div>
        </v-card>
        <v-card width="375px">
          <v-card-text>
            <div id="chart_div" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script>
import formatISO from 'date-fns/formatISO'
import { localeDateString, utcIsoStringFromString } from '~/dates'
export default {
  async fetch () {
    const tankId = this.$route.params.tankId
    const url = `/api/tank/${tankId}`
    const { tank, entryTypes } = await this.$axios.$get(url)
    tank.dateStarted = localeDateString(tank.dateStarted)
    this.tank = tank
    this.entryTypes = entryTypes

  },
  mounted () {
    const script = document.createElement('script')
    script.setAttribute('src', 'https://www.gstatic.com/charts/loader.js')
    script.onload = doit;
    document.head.appendChild(script)

    function doit() {
      google.charts.load('current', {'packages':['corechart', 'line']})
      google.charts.setOnLoadCallback(drawChart);

      function drawChart() {
        var data = new google.visualization.DataTable();
        data.addColumn('number', 'Day');
        data.addColumn('number', 'Guardians of the Galaxy');
        data.addColumn('number', 'The Avengers');
        data.addColumn('number', 'Transformers: Age of Extinction');

        data.addRows([
          [1,  37.8, 80.8, 41.8],
          [2,  30.9, 69.5, 32.4],
          [3,  25.4,   57, 25.7],
          [4,  11.7, 18.8, 10.5],
          [5,  11.9, 17.6, 10.4],
          [6,   8.8, 13.6,  7.7],
          [7,   7.6, 12.3,  9.6],
          [8,  12.3, 29.2, 10.6],
          [9,  16.9, 42.9, 14.8],
          [10, 12.8, 30.9, 11.6],
          [11,  5.3,  7.9,  4.7],
          [12,  6.6,  8.4,  5.2],
          [13,  4.8,  6.3,  3.6],
          [14,  4.2,  6.2,  3.4]
        ]);

        var options = {
          chart: {
            title: 'Box Office Earnings',
            subtitle: 'in millions of dollars (USD)',
          },
          legend: {
              position: 'none'
          }
          // width: 375,
          // height: 375
        };

        var chart = new google.visualization.LineChart(document.getElementById('chart_div'));

        chart.draw(data, options);
      }
    }

  },
  data () {
    return {
      tank: undefined,
      entryTypes: undefined,
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
      return this.entryTypes.filter(jt =>
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
      if (this.selectedJournalType.hasValue) {
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
      set('entryTypeId', this.selectedJournalType.entryTypeId)
      set('value', this.journalValue)
      set('comment', this.journalNote)
      // If the user did not change the date from 'now', we don't send
      // it. That way, the timestamp will be empty and will be set to
      // the current date time server-side. Otherwise, we send it as just
      // the date since we don't know the time.
      const today = formatISO(new Date(), { representation: 'date' })
      if (this.journalDate !== today) {
        set('time', utcIsoStringFromString(this.journalDate))
      }
      const { tank } = await this.$axios.$post('/api/tank/journal', formData)
      this.journalSubmitting = false
      this.selectedJournalType = undefined
      this.tank = tank
    },
    gotoParameters (value) {
      this.$router.push(`/tank/parameters/${this.tank.tankId}`)
    }
  }
}
</script>
