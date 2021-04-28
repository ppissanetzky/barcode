<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h2>Admin</h2>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-autocomplete
          v-model="selectedScript"
          :items="scriptNames"
          label="Script"
          outlined
          hide-details
          clearable
        />
      </v-col>
      <v-col v-if="paramLabel">
        <bc-user-autocomplete
          v-if="paramLabel === 'userid'"
          v-model="userId"
        />
        <v-text-field
          v-else
          v-model="param"
          :label="paramLabel"
          clearable
          outlined
          hide-details
        />
      </v-col>
      <v-col>
        <v-btn
          :disabled="!canRun"
          :color="readonly[selectedScript] ? '' : 'error'"
          @click="runScript"
        >
          Run
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-select
          v-model="selectedJob"
          :items="jobs"
          label="Scheduler job"
          dense
          outlined
          hide-details
          clearable
        />
      </v-col>
      <v-col>
        <v-btn
          :disabled="!selectedJob"
          @click="runJob"
        >
          Run
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-tabs v-model="tab">
          <v-tab>Table</v-tab>
          <v-tab>Raw</v-tab>
        </v-tabs>

        <v-tabs-items v-model="tab">
          <v-tab-item>
            <div v-for="(t, ti) in tables" :key="ti">
              <v-simple-table v-if="t">
                <template v-slot:default>
                  <thead>
                    <tr>
                      <th v-for="(h, hi) in t.headers" :key="hi" class="text-left">
                        {{ h }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, ri) in t.rows" :key="ri">
                      <td v-for="(c, ci) in r" :key="ci" class="text-left">
                        {{ c === null ? 'null' : c }}
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-simple-table>
            </div>
          </v-tab-item>
          <v-tab-item>
            <v-textarea
              v-model="output"
              readonly
              placeholder="Output"
              rows="20"
              class="caption"
            />
          </v-tab-item>
        </v-tabs-items>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcUserAutocomplete from '../components/BcUserAutocomplete.vue'
export default {
  components: { BcUserAutocomplete },
  async fetch () {
    const { scripts, jobs } = await this.$axios.$get('/api/admin/scripts')
    this.scriptNames = scripts.map(({ name }) => name)
    this.paramNames = scripts.reduce((result, { name, param }) => {
      result[name] = param
      return result
    }, {})
    this.readonly = scripts.reduce((result, { name, readonly }) => {
      result[name] = readonly
      return result
    }, {})
    this.jobs = jobs.map(({ name, schedule }) => ({
      value: name,
      text: `${name} (${schedule})`
    }))
  },
  data () {
    return {
      // From the server
      scriptNames: [],
      paramNames: {},
      readonly: {},
      jobs: [],

      // Scripts
      selectedScript: undefined,
      param: undefined,
      userId: undefined,
      paramLabel: undefined,
      output: undefined,
      tables: [],
      tab: undefined,

      // Jobs
      selectedJob: undefined
    }
  },
  computed: {
    canRun () {
      return this.selectedScript &&
        (this.param || !this.paramLabel ||
        (this.paramLabel === 'userid' && this.userId))
    }
  },
  watch: {
    selectedScript (value) {
      this.param = undefined
      this.paramLabel = this.paramNames[value]
      this.userId = undefined
    }
  },
  methods: {
    async runScript () {
      const formData = new FormData()
      formData.set('script', this.selectedScript)
      switch (this.paramLabel) {
        case '':
          formData.set('param', null)
          break
        case 'userid':
          formData.set('param', this.userId.id)
          break
        default:
          formData.set('param', this.param)
      }
      const result = await this.$axios.$post('/api/admin/run', formData)
      if (result.error) {
        this.output = result.error
        this.tab = 1
        this.tables = []
        return
      }
      this.output = JSON.stringify(result, null, 2)
      this.tables = result.map((list) => {
        if (list.length === 0) {
          return ({
            headers: ['No data found'],
            rows: []
          })
        }
        const [first] = list
        const headers = Object.keys(first)
        const rows = list.map(row => headers.map(header => row[header]))
        return { headers, rows }
      })
    },

    async runJob () {
      const formData = new FormData()
      formData.set('job', this.selectedJob)
      const result = await this.$axios.$post('/api/admin/job', formData)
      this.tab = 1
      this.tables = []
      if (result.error) {
        this.output = result.error
        return
      }
      this.output = JSON.stringify(result, null, 2)
    }

  }
}
</script>
