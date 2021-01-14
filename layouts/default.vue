<template>
  <v-app>
    <v-system-bar app />

    <v-app-bar app>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"/>
      <v-toolbar-title>BARcode</v-toolbar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      absolute
      temporary
    >
      <v-list>
        <v-list-item>
          <v-list-item-title>BARcode</v-list-item-title>
        </v-list-item>
        <v-divider />
        <v-list-item to="/">
          <v-list-item-icon><v-icon>mdi-fishbowl-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Your collection</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/dbtc">
          <v-list-item-icon><v-icon>mdi-sitemap</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>DBTC collection</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item to="/equipment">
          <v-list-item-icon><v-icon>mdi-toolbox-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Equipment</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider />
        <v-list-item href="https://bareefers.org/">
          <v-list-item-icon><v-icon>mdi-forum-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Bay Area Reefers</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

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
      drawer: false
    }
  }
}
</script>
