<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h2>Admin</h2>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-select
          v-model="selectedScript"
          :items="scriptNames"
          label="Script"
          dense
          outlined
          hide-details
        />
      </v-col>
      <v-col>
        <v-text-field
          v-model="param"
          :label="paramLabel"
          clearable
          dense
          outlined
          hide-details
        />
      </v-col>
      <v-col>
        <v-btn
          :disabled="!(selectedScript && param)"
          :color="readonly[selectedScript] ? '' : 'error'"
          @click="runScript"
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
export default {
  async fetch () {
    const { scripts } = await this.$axios.$get('/api/admin/scripts')
    this.scriptNames = scripts.map(({ name }) => name)
    this.paramNames = scripts.reduce((result, { name, param }) => {
      result[name] = param
      return result
    }, {})
    this.readonly = scripts.reduce((result, { name, readonly }) => {
      result[name] = readonly
      return result
    }, {})
  },
  data () {
    return {
      scriptNames: [],
      paramNames: {},
      readonly: {},
      selectedScript: undefined,
      param: undefined,
      paramLabel: undefined,
      output: undefined,
      tables: [],
      tab: undefined
    }
  },
  watch: {
    selectedScript (value) {
      this.param = undefined
      this.paramLabel = this.paramNames[value]
    }
  },
  methods: {
    async runScript () {
      const formData = new FormData()
      formData.set('script', this.selectedScript)
      formData.set('param', this.param)
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
          return null
        }
        const [first] = list
        const headers = Object.keys(first)
        const rows = list.map(row => headers.map(header => row[header]))
        return { headers, rows }
      })
    }
  }
}
</script>
