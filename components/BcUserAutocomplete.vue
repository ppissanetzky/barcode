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
    }
  },

  data: () => ({
    users: [],
    isLoading: false,
    selectedUser: undefined,
    searchForUser: undefined
  }),

  watch: {
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

      // Otherwise, if we have already loaded items, don't do it again
      if (this.users.length) {
        return
      }

      // We are currently loading items
      if (this.isLoading) {
        return
      }

      // Request new items out of band
      this.isLoading = true
      this.$axios.$get(`/api/dbtc/find-users?prefix=${encodeURIComponent(value)}`)
        .then(({ users }) => {
          this.users = users.map(([id, name]) => ({ id, name }))
          if (this.excludeUser) {
            this.users = this.users.filter(({ id }) => id !== this.excludeUser)
          }
        })
        .finally(() => {
          this.isLoading = false
        })
    }
  }
}
</script>
