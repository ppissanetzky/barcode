<template>
  <v-app>
    <v-app-bar app dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-app-bar-title>BARcode Market</v-app-bar-title>
      <v-spacer />
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      temporary
      app
      dark
    >
      <v-list>
        <v-list-item>
          <v-list-item-title>BARcode</v-list-item-title>
          <v-list-item-subtitle>{{ $config.version }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider />
        <v-list-item href="https://bareefers.org/" target="_blank">
          <v-list-item-icon><v-icon>mdi-forum-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Bay Area Reefers</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <v-theme-provider dark>
        <nuxt />
      </v-theme-provider>
    </v-main>
  </v-app>
</template>

<script>
export default {
  data () {
    return {
      drawer: false
    }
  }
}
</script>
