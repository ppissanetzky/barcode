<template>
  <v-app>
    <v-system-bar app />

    <v-app-bar app>
      <v-toolbar-title v-text="title" />
      <v-spacer />
      <v-btn text to="/">
        DBTC
      </v-btn>
      <v-btn text to="/equipment">
        Equipment
      </v-btn>
    </v-app-bar>

    <v-main>
      <nuxt />
    </v-main>

    <v-footer app />
  </v-app>
</template>

<script>
export default {
  data () {
    return {
      title: 'BARcode'
    }
  }
}
</script>
