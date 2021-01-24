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

      <v-chip small color="primary" v-text="fragOrMother.type" />

      <!-- A chip for the age, if it has one -->

      <v-chip v-if="age" small v-text="age" />

      <!-- A chip for the collection it is in, only when it is a frag -->

      <v-chip v-if="isFrag" small v-text="fragOrMother.rules.toUpperCase()" />

      <!-- If it is a mother and this user owns it, a chip to that effect -->

      <v-chip
        v-if="isMother && ownsIt"
        small
        color="warning"
      >
        You have it
      </v-chip>

      <!-- A chip to show the total number of available frags -->

      <v-chip v-if="fragsAvailable" small v-text="`${fragsAvailable} available`" />

      <!-- A chip that shows it is dead -->

      <v-chip
        v-if="!isAlive"
        small
        color="error"
      >
        RIP
      </v-chip>
    </v-card-text>

    <!-- A table to show light, flow, hardiness and growth rate -->

    <v-simple-table dense>
      <template v-slot:default>
        <thead>
          <tr>
            <th
              class="text-center"
            >
              Light
            </th>
            <th
              class="text-center"
            >
              Flow
            </th>
            <th
              class="text-center"
            >
              Hardiness
            </th>
            <th
              class="text-center"
            >
              Growth rate
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              class="text-center"
            >
              {{ fragOrMother.light.toLowerCase() }}
            </td>
            <td
              class="text-center"
            >
              {{ fragOrMother.flow.toLowerCase() }}
            </td>
            <td
              class="text-center"
            >
              {{ fragOrMother.hardiness.toLowerCase() }}
            </td>
            <td
              class="text-center"
            >
              {{ fragOrMother.growthRate.toLowerCase() }}
            </td>
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

    <div v-if="!to && !isPrivate">
      <v-divider />
      <v-card-actions>
        <h3>Lineage</h3>
        <v-spacer />
        <v-btn
          icon
          @click="showLineage = !showLineage"
        >
          <v-icon>{{ showLineage ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
      </v-card-actions>

      <v-expand-transition>
        <div v-show="showLineage">
          <v-divider />
          <div v-if="lineage.length === 0" class="text-center">
            <v-progress-linear
              indeterminate
              color="primary"
            />
          </div>
          <div v-else>
            <v-treeview
              :items="lineage"
              item-key="fragId"
              item-text="text"
              open-all
              dense
            >
              <template v-slot:prepend="{ item }">
                <v-avatar
                  v-if="item.original"
                  size="23"
                  color="primary lighten-1"
                >
                  <span
                    v-if="item.text && item.children.length"
                    class="white--text"
                    v-text="item.children.length"
                  />
                </v-avatar>
                <v-avatar
                  v-else-if="item.children.length > 1"
                  size="23"
                  color="orange darken-4"
                >
                  <span class="white--text" v-text="item.children.length" />
                </v-avatar>

                <v-avatar
                  v-else-if="item.children.length > 0"
                  size="23"
                  color="teal lighten-1"
                >
                  <span class="white--text" v-text="item.children.length" />
                </v-avatar>
                <v-avatar
                  v-else
                  size="23"
                  color="teal lighten-4"
                />
                <strong v-text="user.id === item.owner.id ? 'You' : item.owner.name" />
              </template>
            </v-treeview>
          </div>
        </div>
      </v-expand-transition>
    </div>

    <slot />
  </v-card>
</template>
<script>

import { age } from '~/dates'

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

    lineage: [],
    gotLineage: false,

    // Controls showing the notes
    showNotes: false,
    // Showing the lineage
    showLineage: false
  }),
  computed: {
    isFrag () {
      return !!this.fragOrMother.fragId
    },
    isMother () {
      return !this.isFrag
    },
    isAlive () {
      if (this.isFrag) {
        return this.fragOrMother.isAlive
      }
      return true
    },
    isPrivate () {
      return this.fragOrMother.rules === 'private'
    },
    fragsAvailable () {
      const thing = this.fragOrMother
      if (thing.rules === 'private') {
        return 0
      }
      if (thing.fragId) {
        return thing.isAlive ? thing.fragsAvailable : 0
      }
      return thing.fragsAvailable
    },
    pictures () {
      const thing = this.fragOrMother
      if (thing.fragId) {
        return thing.picture ? [thing.picture] : []
      }
      return thing.pictures
    },
    ownsIt () {
      if (this.isFrag) {
        return this.user.id === this.fragOrMother.ownerId
      }
      return this.fragOrMother.ownsIt
    },
    age () {
      if (this.isFrag) {
        return this.isAlive ? age(this.fragOrMother.dateAcquired, '', 'old') : null
      }
      return null
    }
  },
  watch: {
    showLineage (value) {
      this.updateLineage(false)
    },
    fragsAvailable (value) {
      this.updateLineage(true)
    }
  },
  methods: {
    updateLineage (force) {
      function addAge (node) {
        node.text = `${age(node.dateAcquired, 'today', 'ago')}`
        if (node.children) {
          node.children.forEach(addAge)
        } else {
          node.children = []
        }
      }

      if (this.gotLineage && !force) {
        return
      }

      this.$nextTick(async () => {
        const { root } = await this.$axios.$get(`/bc/api/dbtc/tree/${this.fragOrMother.motherId}`)
        addAge(root)
        root.original = true
        if (this.fragOrMother.source) {
          this.lineage = [{
            fragId: 'source',
            text: '',
            owner: {
              name: this.fragOrMother.source
            },
            original: true,
            children: [root]
          }]
        } else {
          this.lineage = [root]
        }
        this.gotLineage = true
      })
    }
  }
}
</script>
