<template>
  <v-autocomplete
    v-model="selectedUser"
    :items="users"
    :loading="isLoading"
    :search-input.sync="searchForUser"
    hide-no-data
    hide-selected
    item-text="name"
    item-value="id"
    placeholder="Start typing to search"
    return-object
    :label="label"
    outlined
    hide-details
    clearable
  />
</template>
<script>
export default {
  props: {
    label: {
      type: String,
      default: undefined
    },
    value: {
      type: Object,
      default: null
    },
    excludeUser: {
      type: Number,
      default: 0
    },
    allowAll: {
      type: Boolean,
      default: false
    }
  },

  data: () => ({
    users: [],
    isLoading: false,
    selectedUser: undefined,
    searchForUser: undefined,
    loading: Promise.resolve()
  }),

  watch: {
    value (value) {
      if (!value) {
        this.selectedUser = undefined
      }
    },

    selectedUser (value) {
      this.$emit('input', value)
    },

    searchForUser (value) {
      // If the value is empty, clear the selection and the fetched users
      if (!value) {
        this.selectedUser = undefined
        this.users = []
        return
      }

      // Request new items out of band
      this.loading = this.loading.then(() => {
        this.isLoading = true
        const url = '/api/dbtc/find-users'
        const options = {
          params: {
            prefix: value,
            all: this.allowAll
          }
        }
        return this.$axios.$get(url, options)
          .then(({ users }) => {
            this.users = users.map(([id, name]) => ({ id, name }))
            if (this.excludeUser) {
              this.users = this.users.filter(({ id }) => id !== this.excludeUser)
            }
          })
      }).finally(() => {
        this.isLoading = false
      })
    }
  }
}
</script>
