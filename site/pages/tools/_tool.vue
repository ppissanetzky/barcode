<template>
  <v-container fluid>
    <v-card
      v-if="tool"
      flat
    >
      <v-card-title class="overline" v-text="tool" />
      <v-card-actions v-if="select">
        <v-select
          v-model="selected"
          :items="select.items"
          :label="select.name"
          outlined
          hide-details
        />
      </v-card-actions>
      <v-card-actions v-if="table.actions && table.actions.length">
        <v-btn
          v-for="action in table.actions"
          :key="action.name"
          small
          class="mr-2"
          @click="executeAction(action.params)"
          v-text="action.name"
        />
      </v-card-actions>
      <v-card-actions>
        <v-data-table
          :headers="table.headers"
          :items="table.items"
          item-key="key"
        />
      </v-card-actions>
    </v-card>
    <v-dialog
      v-if="dialog"
      v-model="dialog"
      persistent
      max-width="375"
    >
      <v-card v-if="dialog">
        <v-card-title>{{ dialog.title }}</v-card-title>
        <v-card-actions
          v-for="e in dialog.elements"
          :key="e.value"
        >
          <bc-user-autocomplete
            v-if="e.type === 'userid'"
            v-model="submit[e.value]"
          />
          <v-text-field
            v-else-if="e.type === 'text'"
            v-model="submit[e.value]"
            :label="e.text"
            clearable
            outlined
            hide-details
          />
          <v-select
            v-if="e.type === 'select'"
            v-model="submit[e.value]"
            :label="e.text"
            :items="e.items"
            outlined
            hide-details
          />
        </v-card-actions>
        <v-card-actions>
          <span v-if="error" class="ml-3 red--text">
            {{ error }}
          </span>
          <v-spacer />
          <v-btn small @click="dialog = undefined">
            Cancel
          </v-btn>
          <v-btn small color="primary" @click="submitDialog()">
            Submit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    this.tool = this.$route.params.tool
    const { select } = await this.$axios.$get(`/api/admin/tool/${this.tool}`)
    if (!select) {
      return this.loadTable(this.tool)
    }
    this.select = select
  },
  data () {
    return {
      tool: undefined,
      select: undefined,
      table: {},
      dialog: undefined,
      // The item chosen in the select
      selected: undefined,
      // The stuff from the dialog
      submit: undefined,
      error: undefined
    }
  },
  watch: {
    async selected (value) {
      if (value) {
        await this.loadTable(value)
      } else {
        this.table = {}
      }
    }
  },
  methods: {
    async loadTable (value) {
      const { table } = await this.$axios.$get(`/api/admin/table/${this.tool}/${encodeURIComponent(value)}`)
      this.table = table
    },
    async executeAction (params) {
      this.submit = {}
      this.error = undefined
      this.dialog = await this.$axios.$post(`/api/admin/action/${this.tool}`, params)
    },
    async submitDialog () {
      const url = `/api/admin/dialog/${this.tool}`
      const { error, table } = await this.$axios.$post(url, {
        params: this.dialog.params,
        submit: this.submit
      })
      if (error) {
        this.error = error
        setTimeout(() => {
          this.error = undefined
        }, 4000)
      } else {
        this.table = table
        this.dialog = undefined
        this.error = undefined
        this.submit = undefined
      }
    }

    // async submit () {
    //   this.submitting = true
    //   const { itemId } = this.$route.params
    //   const url = `/api/equipment/queue/${itemId}`
    //   await this.$axios.$delete(url)
    //   // After we are done, go back to the queue
    //   this.$router.replace(`/equipment/queue/${itemId}`)
    // }
  }
}
</script>
