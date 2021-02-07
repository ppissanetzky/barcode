<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1>Oops! Something went wrong :(</h1>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <h2 v-text="message" />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <form :action="link">
          <v-btn
            depressed
            color="primary"
            type="submit"
            v-text="button"
          />
        </form>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <br>
        <v-divider />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        When reporting this problem, mention code
        <v-chip
          label
          v-text="code"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  data () {
    return {
      code: undefined,
      message: undefined,
      link: undefined,
      button: undefined
    }
  },
  mounted () {
    const { query } = this.$route
    this.code = query.code
    this.message = query.message
    this.link = query.link || this.$router.options.base
    this.button = query.button || 'OK'
  }
}
</script>
