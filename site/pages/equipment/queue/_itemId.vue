<template>
  <v-container fluid>
    <v-card
      v-if="item"
      elevation="6"
      width="375px"
    >
      <v-card-title v-text="item.name" />
      <v-card-subtitle>
        {{ item.quantity }} available to borrow for {{ item.maxDays }} days.
        See <a :href="item.rules" target="_blank">rules</a> and <a :href="item.instructions" target="_blank">instructions</a>.
      </v-card-subtitle>

      <!--
        Available
      -->

      <v-list v-if="available.length > 0" two-line>
        <v-divider />
        <v-list-item class="grey lighten-3">
          <v-list-item-content>
            <v-list-item-title class="primary--text">
              <strong>{{ available.length }} available</strong>
            </v-list-item-title>
            <v-list-item-subtitle />
          </v-list-item-content>
          <v-list-item-action v-if="whereToGetInLine === 'available'">
            <v-btn
              small
              depressed
              color="primary"
              @click.stop="$router.push(`/equipment/get-in-line/${item.itemId}`)"
            >
              Get in line
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider />
        <v-list-item
          v-for="(av, i) in available"
          :key="i"
        >
          <v-list-item-content>
            <v-list-item-title v-if="av.user.id === user.id">
              <strong>You</strong>
            </v-list-item-title>
            <v-list-item-title v-else>
              {{ av.user.name + (av.location ? ` in ${av.location}` : '') }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ av.ageAvailable }}</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action v-if="av.user.id === user.id">
            <v-btn
              small
              depressed
              color="primary"
              @click.stop="$router.push(`/equipment/pass/${item.itemId}`)"
            >
              Pass it on
            </v-btn>
          </v-list-item-action>
          <v-list-item-action v-else-if="av.overdue">
            <v-icon color="error">
              mdi-alarm
            </v-icon>
          </v-list-item-action>
        </v-list-item>
      </v-list>

      <!--
        In use
      -->

      <v-list v-if="haves.length > 0" two-line>
        <v-divider />
        <v-list-item class="grey lighten-3">
          <v-list-item-content>
            <v-list-item-title class="primary--text">
              <strong>{{ haves.length }} in use</strong>
            </v-list-item-title>
            <v-list-item-subtitle />
          </v-list-item-content>
          <v-list-item-action v-if="whereToGetInLine === 'haves'">
            <v-btn
              small
              depressed
              color="primary"
              @click.stop="$router.push(`/equipment/get-in-line/${item.itemId}`)"
            >
              Get in line
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider />
        <v-list-item
          v-for="(av, i) in haves"
          :key="i"
        >
          <v-list-item-content>
            <v-list-item-title v-if="av.user.id === user.id">
              <strong>You</strong>
            </v-list-item-title>
            <v-list-item-title v-else>
              {{ av.user.name + (av.location ? ` in ${av.location}` : '') }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ av.age }}</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action v-if="av.user.id === user.id">
            <v-btn
              small
              depressed
              color="primary"
              @click.stop="$router.push(`/equipment/pass/${item.itemId}`)"
            >
              Done with it
            </v-btn>
          </v-list-item-action>
          <v-list-item-action v-else-if="av.overdue">
            <v-icon color="error">
              mdi-alarm
            </v-icon>
          </v-list-item-action>
        </v-list-item>
      </v-list>

      <!--
        Waiting
      -->

      <v-list v-if="waiters.length > 0" three-line>
        <v-divider />
        <v-list-item class="grey lighten-3">
          <v-list-item-content>
            <v-list-item-title class="primary--text">
              <strong>{{ waiters.length }} waiting</strong>
            </v-list-item-title>
            <v-list-item-subtitle />
            <v-list-item-subtitle />
          </v-list-item-content>
          <v-list-item-action v-if="whereToGetInLine === 'waiters'">
            <v-btn
              small
              depressed
              color="primary"
              @click.stop="$router.push(`/equipment/get-in-line/${item.itemId}`)"
            >
              Get in line
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider />
        <v-list-item
          v-for="(av, i) in waiters"
          :key="i"
        >
          <v-list-item-content>
            <v-list-item-title v-if="av.user.id === user.id">
              <strong>You</strong>
            </v-list-item-title>
            <v-list-item-title v-else>
              {{ av.user.name + (av.location ? ` in ${av.location}` : '') }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ av.ageWaiting }}</v-list-item-subtitle>
            <v-list-item-subtitle>should get it {{ av.eta }}</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action v-if="av.user.id === user.id">
            <v-btn
              small
              depressed
              color="primary"
              @click.stop="$router.push(`/equipment/drop-out/${item.itemId}`)"
            >
              Drop out
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    const { itemId } = this.$route.params
    const url = `/api/equipment/queue/${itemId}`
    const { user, ban, item, queue: { haves, waiters } } =
      await this.$axios.$get(url)
    this.user = user
    this.ban = ban
    this.item = item
    this.available = haves.filter(({ isAvailable }) => isAvailable)
    this.haves = haves.filter(({ isAvailable }) => !isAvailable)
    this.waiters = waiters
  },
  data () {
    return {
      user: undefined,
      ban: undefined,
      item: undefined,
      available: undefined,
      haves: undefined,
      waiters: undefined
    }
  },
  computed: {
    whereToGetInLine () {
      // If there is an item
      //  and this user is not in the list
      //  and this user is not banned
      if (this.item && !this.item.inList && !this.ban) {
        // If there are people waiting, we will put it there
        if (this.waiters.length > 0) {
          return 'waiters'
        }
        // Otherwise, if there are some available, put it there
        if (this.available.length > 0) {
          return 'available'
        }
        // Or, if they are in use, there it goes
        if (this.haves.length > 0) {
          return 'haves'
        }
      }
      return false
    }
  }
}
</script>
