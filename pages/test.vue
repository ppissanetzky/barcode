<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>Test page</h1>
      </v-col>
    </v-row>
    <v-row>
      <v-autocomplete
        v-model="selectedUser"
        :items="users"
        :loading="isLoadingUsers"
        :search-input.sync="searchForUser"
        hide-no-data
        hide-selected
        item-text="name"
        item-value="id"
        label="Recipient"
        placeholder="Start typing to search"
        prepend-icon="mdi-database-search"
        return-object
        outlined
      />
      <v-divider />
    </v-row>
  </v-container>
</template>
<script>
export default {
  data: () => ({
    users: [],
    isLoadingUsers: false,
    selectedUser: null,
    searchForUser: null
  }),

  watch: {
    async searchForUser (value) {
      // Items have already been requested
      if (this.isLoadingUsers) {
        return
      }

      // Lazily load input items
      this.isLoadingUsers = true
      try {
        const { users } = await this.$axios.$get(`/bc/api/dbtc/find-users?prefix=${encodeURIComponent(value)}`)
        this.users = users.map(([id, name]) => ({ id, name }))
      } finally {
        this.isLoadingUsers = false
      }
    }
  }
}
</script>
