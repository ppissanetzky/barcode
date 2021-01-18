<template>
  <v-card
    :to="to"
    max-width="375"
  >
    <!--
      Start with a carousel for the pictures
      If there is only one picture, we will hide the arrows
      and delimiters so it doesn't look like a carousel
    -->
    <v-carousel
      v-if="pictures.length"
      :show-arrows="pictures.length > 1"
      :hide-delimiters="pictures.length == 1"
      show-arrows-on-hover
      height="300"
    >
      <v-carousel-item
        v-for="(picture, i) in pictures"
        :key="i"
        :src="`${$config.BC_UPLOADS_URL}/${picture}`"
      />
    </v-carousel>

    <!--
      If there are no pictures at all, we just show the placeholder image
    -->

    <v-img
      v-else
      max-width="375px"
      max-height="300px"
      src="/picture-placeholder.png"
    />

    <!--
      Now, the name and scientific name
    -->

    <v-card-title v-text="fragOrMother.name" />
    <v-card-subtitle v-text="fragOrMother.scientificName" />

    <v-card-text>
      <!-- A chip for the type -->

      <v-chip label color="primary" v-text="fragOrMother.type" />

      <!-- A chip for the age, if it has one -->

      <v-chip v-if="age" label v-text="age" />

      <!-- If it is a mother and this user owns it, a chip to that effect -->

      <v-chip
        v-if="isMother && ownsIt"
        label
        color="warning"
      >
        You have it
      </v-chip>

      <!-- A chip to show the total number of available frags -->

      <v-chip v-if="fragsAvailable" label v-text="`${fragsAvailable} available`" />

      <!-- A chip that shows it is dead -->

      <v-chip v-if="!isAlive" color="error" label>RIP</v-chip>

    </v-card-text>

    <!-- A table to show light, flow, hardiness and growth rate -->

    <v-simple-table dense>
      <template v-slot:default>
        <thead>
          <tr>
            <th class="text-center">Light</th>
            <th class="text-center">Flow</th>
            <th class="text-center">Hardiness</th>
            <th class="text-center">Growth rate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">{{ fragOrMother.light.toLowerCase() }}</td>
            <td class="text-center">{{ fragOrMother.flow.toLowerCase() }}</td>
            <td class="text-center">{{ fragOrMother.hardiness.toLowerCase() }}</td>
            <td class="text-center">{{ fragOrMother.growthRate.toLowerCase() }}</td>
          </tr>
        </tbody>
      </template>
    </v-simple-table>

    <!--
    <div v-if="m.haves.length">
      <v-divider />
      <v-list>
        <v-card-title>These members have frags</v-card-title>
        <v-list-item
          v-for="owner in m.haves"
          :key="owner.ownerId"
        >
          <v-list-item-avatar>
            <v-img
              v-if="owner.avatarUrl"
              :src="owner.avatarUrl"
            />
            <v-icon
              v-else
              size="48px"
            >
              mdi-account-circle
            </v-icon>
          </v-list-item-avatar>

          <v-list-item-content>
            <v-list-item-title>
              <a :href="owner.viewUrl" target="_blank">{{ owner.name }}</a>
              {{ owner.fragsAvailable ? ' has ' + owner.fragsAvailable : 'doesn\'t have any frags' }}
              {{ owner.location && owner.fragsAvailable ? ' in ' + owner.location : '' }}
            </v-list-item-title>
          </v-list-item-content>

          <v-list-item-action>
            <v-btn icon :to="'/frag/' + owner.fragId">
              <v-icon>mdi-information</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </div>

    <div v-if="m.haveNots.length">
      <v-divider />
      <v-list>
        <v-card-subtitle>These members don't have frags right now</v-card-subtitle>
        <v-list-item
          v-for="owner in m.haveNots"
          :key="owner.ownerId"
        >
          <v-list-item-avatar>
            <v-img
              v-if="owner.avatarUrl"
              :src="owner.avatarUrl"
            />
            <v-icon
              v-else
              size="48px"
            >
              mdi-account-circle
            </v-icon>
          </v-list-item-avatar>

          <v-list-item-content>
            <v-list-item-title>
              <a :href="owner.viewUrl" target="_blank">{{ owner.name }}</a>
              {{ owner.location ? ' in ' + owner.location : '' }}
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action>
            <v-btn icon :to="'/frag/' + owner.fragId">
              <v-icon>mdi-information</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </div>
    -->

    <div v-if="fragOrMother.notes && !to">
      <v-divider />
      <v-card-actions>
        <h3>Notes</h3>
        <v-spacer />
        <v-btn
          icon
          @click="showNotes = !showNotes"
        >
          <v-icon>{{ showNotes ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
      </v-card-actions>

      <v-expand-transition>
        <div v-show="showNotes">
          <v-divider />
          <v-card-text v-text="fragOrMother.notes" />
        </div>
      </v-expand-transition>
    </div>
    <slot/>
  </v-card>
</template>
<script>

import { parseISO, differenceInDays, formatDistance } from 'date-fns'

function age (isoDate, textForToday, suffix) {
  const today = new Date()
  const date = parseISO(isoDate)
  if (differenceInDays(today, date) < 1) {
    return textForToday
  }
  return `${formatDistance(today, date)}${suffix ? ' ' + suffix : ''}`
}

export default {
  props: {
    user: {
      type: Object,
      default: null
    },
    fragOrMother: {
      type: Object,
      default: null
    },
    to: {
      type: String,
      default: ''
    }
  },
  data: () => ({
    initialized: false,
    renderKey: 0,

    pictures: [],
    isFrag: false,
    isMother: false,
    ownsIt: false,
    age: '',
    fragsAvailable: 0,
    isAlive: false,

    // Controls showing the notes
    showNotes: false
  }),
  mounted () {
    const thing = this.fragOrMother
    const user = this.user
    // If it has a fragId, it is a frag
    const isFrag = thing.fragId
    // Save that information
    this.isFrag = isFrag
    this.isMother = !isFrag
    // Now, normalize
    if (isFrag) {
      // If it is a frag, it only has one picture
      this.pictures = thing.picture ? [thing.picture] : []
      // The user owns it
      this.ownsIt = user.id === thing.ownerId
      // Alive
      this.isAlive = thing.isAlive
      // It has an age
      this.age = this.isAlive ? age(thing.dateAcquired, '', 'old') : null
      // The available frags
      this.fragsAvailable = this.isAlive ? thing.fragsAvailable : 0
    } else {
      // Otherwise, it may have several pictures
      this.pictures = thing.pictures
      console.log(this.pictures)
      // Whether this user owns it comes from the server
      this.ownsIt = thing.ownsIt
      // Alive
      this.isAlive = true
      // It has no age...kinda
      this.age = null
      // The total number of available frags
      this.fragsAvailable = thing.fragsAvailable
    }
  }
}
</script>
