<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <!-- Dialog to edit, delete or add entries -->
        <v-dialog
          v-model="showDialog"
          max-width="500px"
        >
          <v-card>
            <v-toolbar
              flat
              :color="dialog.entry.color"
            >
              <v-toolbar-title>{{ dialog.entry.name }}</v-toolbar-title>
            </v-toolbar>
            <v-divider />
            <v-card-text />
            <v-card-text>
              <v-form
                ref="form"
                v-model="formValid"
                :disabled="formSubmitting"
              >
                <v-container>
                  <v-row>
                    <v-col
                      v-if="dialog.entry.hasValue"
                    >
                      <v-text-field
                        v-model="dialog.entry.value"
                        :label="dialog.entry.units || 'Value'"
                        :rules="[validateValue]"
                        outlined
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>
                      <v-textarea
                        v-model="dialog.entry.comment"
                        label="Comment"
                        :rules="[validateComment]"
                        rows="2"
                        outlined
                      />
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col>
                      <v-text-field
                        v-model="dialog.date"
                        label="Date/time"
                        :rules="[validateDateTime]"
                        :hint="dateTimeHint"
                        outlined
                      />
                    </v-col>
                  </v-row>
                </v-container>
              </v-form>
            </v-card-text>
            <v-divider />
            <v-card-actions>
              <v-checkbox
                v-if="!dialog.adding"
                v-model="areYouSure"
                label="if you're sure"
                color="error"
              />
              <v-btn
                v-if="!dialog.adding"
                text
                color="error"
                :disabled="!areYouSure"
                @click.stop="deleteEntry"
              >
                Delete
              </v-btn>
              <v-spacer />
              <v-btn
                text
                color="secondary"
                @click="showDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn
                text
                color="primary"
                :disabled="!formValid"
                @click.stop="submitEntry"
              >
                {{ dialog.adding ? 'Add' : 'Save' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
      <!-- Card with the data -->
      <v-col cols="12">
        <v-card
          v-if="tank"
          elevation="6"
        >
          <v-card-title>
            {{ tank.name }}
            <v-spacer />
            <v-menu
              offset-y
              close-on-content-click
              close-on-click
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  color="primary"
                  v-bind="attrs"
                  v-on="on"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </template>
              <v-card flat max-width="500px">
                <v-card-text>
                  <v-chip
                    v-for="type in trackedEntryTypes"
                    :key="type.entryTypeId"
                    small
                    label
                    :color="type.color"
                    class="ma-1"
                    @click="addEntry(type.entryTypeId)"
                  >
                    {{ type.name }}
                  </v-chip>
                </v-card-text>
                <v-divider />
                <v-card-text>
                  <v-chip
                    v-for="type in noteEntryTypes"
                    :key="type.entryTypeId"
                    small
                    label
                    :color="type.color"
                    class="ma-1"
                    @click="addEntry(type.entryTypeId)"
                  >
                    {{ type.name }}
                  </v-chip>
                </v-card-text>
                <v-divider />
                <v-card-text>
                  <v-chip
                    small
                    label
                    color="primary"
                    class="ma-1"
                    @click="$router.push(`/tank/import/trident-datalog/${tank.tankId}`)"
                  >
                    Import Trident data
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-menu>
            <v-spacer />
            <v-autocomplete
              v-model="selectedEntryTypes"
              :items="entryTypesToSelect"
              label="Filter"
              chips
              multiple
              clearable
              hide-details
              outlined
              dense
            >
              <template v-slot:selection="data">
                <v-chip
                  v-bind="data.attrs"
                  :input-value="data.selected"
                  label
                  small
                  close
                  :color="data.item.color"
                  @click="data.select"
                  @click:close="removeSelectedEntryType(data.item.value)"
                >
                  {{ data.item.text }}
                </v-chip>
              </template>
            </v-autocomplete>
            <v-spacer />
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Search"
              clearable
              hide-details
              outlined
              dense
            />
            <v-spacer />
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="filteredEntries"
              :search="search"
              item-key="rowid"
              hide-default-header
              dense
              @click:row="clickRow"
            >
              <template v-slot:[`item.name`]="{ item }">
                <v-chip
                  label
                  small
                  class="ma-1"
                  :color="item.color"
                >
                  {{ item.name }}
                </v-chip>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import parse from 'date-fns/parse'
import format from 'date-fns/format'
import fromUnixTime from 'date-fns/fromUnixTime'
import getUnixTime from 'date-fns/getUnixTime'
import formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict'
export default {
  async fetch () {
    const tankId = this.$route.params.tankId
    const url = `/api/tank/parameters/${tankId}`
    const { entryTypes, tank, entries } = await this.$axios.$get(url)
    this.tank = tank
    this.entryTypes = entryTypes
    this.entryTypesToSelect = entryTypes.map(({ entryTypeId, name, color }) =>
      ({ value: entryTypeId, text: name, color }))
    for (const entry of entries) {
      entry.date = this.unixTimeToLocaleString(entry.time)
    }
    this.entries = entries
    this.headers = [
      { value: 'name', sortable: false },
      { value: 'text', sortable: false },
      { value: 'age', sortable: false, filterable: false, cellClass: 'text-right' }
      // { value: 'date', sortable: false, cellClass: 'caption text-right' }
    ]
  },
  /*
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
  */
  data () {
    return {
      // Data from the server
      tank: undefined,
      entryTypes: undefined,
      entries: undefined,
      // Header definition for the table
      headers: undefined,
      // Entry types that can be selected in the filter dropdown
      entryTypesToSelect: [],
      // Entry types that are selected in the filter dropdown
      selectedEntryTypes: [],
      // Search model
      search: undefined,
      // Show dialog model
      showDialog: undefined,
      // Stuff for the dialog
      dialog: {
        entry: {},
        adding: false,
        date: undefined,
        originalDate: undefined
      },
      // Whether the dialog form is valid
      formValid: false,
      // While the form is submitting
      formSubmitting: false,
      // A hint we show about the date
      dateTimeHint: undefined,
      // Sure to delete
      areYouSure: false
    }
  },
  computed: {

    filteredEntries () {
      if (this.selectedEntryTypes.length === 0) {
        return this.entries
      }
      const types = new Set(this.selectedEntryTypes)
      return this.entries.filter(({ type }) => types.has(type))
    },

    trackedEntryTypes () {
      return this.entryTypes.filter(({ isTracked }) => isTracked)
    },

    noteEntryTypes () {
      return this.entryTypes.filter(({ isTracked }) => !isTracked)
    }
  },
  watch: {

    showDialog (value) {
      if (value) {
        setTimeout(() => this.$refs.form.resetValidation(), 1)
      }
    }
  },
  methods: {

    removeSelectedEntryType (entryTypeId) {
      this.selectedEntryTypes = this.selectedEntryTypes.filter(value =>
        value !== entryTypeId)
    },

    unixTimeToLocaleString (time) {
      const date = fromUnixTime(time)
      if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        return format(date, 'P')
      }
      return format(date, 'P pp')
    },

    async clickRow (item, metadata) {
      const url = `/api/tank/entry/${this.tank.tankId}/${item.rowid}`
      const { entry } = await this.$axios.$get(url)
      const date = format(fromUnixTime(entry.time), 'P pp')
      this.dialog = {
        entry,
        date,
        originalDate: date,
        adding: false
      }
      this.dateTimeHint = undefined
      this.areYouSure = false
      this.showDialog = true
    },

    addEntry (entryTypeId) {
      const date = format(new Date(), 'P pp')
      const entry = this.entryTypes.find(type => type.entryTypeId === entryTypeId)
      this.dialog = {
        entry,
        date,
        originalDate: date,
        adding: true
      }
      this.dateTimeHint = undefined
      this.showDialog = true
    },

    validateValue (value) {
      if (!this.dialog.entry.hasValue) {
        return true
      }
      if (!value) {
        return 'A value is required'
      }
      const float = parseFloat(value)
      if (isNaN(float) || float < 0) {
        return 'This must be a positive number'
      }
      return true
    },

    validateComment (value) {
      if (this.dialog.entry.hasValue) {
        return true
      }
      if (!value) {
        return 'A comment is required'
      }
      return true
    },

    validateDateTime (value) {
      this.dateTimeHint = undefined
      const original = this.dialog.originalDate
      if (value === original) {
        return true
      }
      const now = new Date()
      const date = parse(value, 'P pp', now)
      const time = date.getTime()
      if (isNaN(time)) {
        return `Invalid date/time, it must look like ${original}`
      }
      if (time > now.getTime()) {
        return 'The date/time cannot be in the future'
      }
      if (now.getFullYear() - date.getFullYear() > 4) {
        return 'This date is too long ago'
      }
      this.dateTimeHint = formatDistanceToNowStrict(date, { addSuffix: true })
      return true
    },

    async submitEntry () {
      this.formSubmitting = true
      // Whether we are adding a new entry or updating an existing one
      const adding = this.dialog.adding
      const formData = new FormData()
      function set (key, value) {
        if (value) {
          formData.set(key, value)
        }
      }
      set('tankId', this.tank.tankId)
      if (adding) {
        set('entryTypeId', this.dialog.entry.entryTypeId)
      } else {
        set('rowid', this.dialog.entry.rowid)
      }
      set('value', this.dialog.entry.value)
      set('comment', this.dialog.entry.comment)
      const date = parse(this.dialog.date, 'P pp', new Date())
      set('time', getUnixTime(date))
      const { entry } = await this.$axios.$post('/api/tank/entry', formData)
      // Add the locale date
      entry.date = this.unixTimeToLocaleString(entry.time)
      // If this is a new entry, we add it to the beginning
      if (adding) {
        this.entries.unshift(entry)
      } else {
        // If this is an existing entry, we're going to replace it
        const index = this.entries.findIndex(({ rowid }) => rowid === entry.rowid)
        if (index >= 0) {
          this.entries[index] = entry
        }
      }
      // Now, sort the array
      this.entries = this.entries.sort((a, b) => b.time - a.time)
      this.formSubmitting = false
      this.showDialog = false
    },

    async deleteEntry () {
      this.formSubmitting = true
      const rowid = this.dialog.entry.rowid
      const url = `/api/tank/entry/${this.tank.tankId}/${rowid}`
      await this.$axios.$delete(url)
      const index = this.entries.findIndex(entry => rowid === entry.rowid)
      // Remove it
      if (index >= 0) {
        this.entries.splice(index, 1)
      }
      this.formSubmitting = false
      this.showDialog = false
    }
  }
}
</script>
