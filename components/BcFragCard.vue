<template>
  <v-card width="375px">
    <!-- Picture or placeholder -->
    <v-img
      height="300px"
      :src="frag.picture ? `${$config.BC_UPLOADS_URL}/${frag.picture}` : '/bc/picture-placeholder.png'"
    >
      <v-alert
        :value="shareAlert"
        transition="slide-y-transition"
        class="ma-2"
      >
        <v-row>
          <v-col>
            Here is a link to share this item. Note that all details about this item as it is now will be publicly visible.
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-text-field
              v-model="shareLink"
              :loading="!shareLink"
              dense
              readonly
              hide-details
              outlined
              full-width
              @focus.native="$event.target.select()"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-btn
              small
              color="secondary"
              @click="shareAlert = false"
            >
              OK
            </v-btn>
          </v-col>
        </v-row>
      </v-alert>
    </v-img>

    <!-- A transparent bar with a 3-dot button for a menu -->

    <v-app-bar flat color="rgba(0, 0, 0, 0)" dense class="ma-0">
      <h3>{{ frag.name }}</h3>
      <v-spacer />
      <v-menu v-if="ownsIt">
        <template v-slot:activator="{on, attrs}">
          <v-btn
            icon
            small
            v-bind="attrs"
            v-on="on"
          >
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-if="showEdit">
            <v-btn
              icon
              color="primary"
              :to="`/add-new-item?fragId=${frag.fragId}`"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-list-item>
          <v-list-item>
            <v-btn
              icon
              color="primary"
              @click="getShareLink"
            >
              <v-icon>mdi-export-variant</v-icon>
            </v-btn>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Scientific name -->
    <v-card-subtitle v-if="frag.scientificName" v-text="frag.scientificName" />

    <v-card-text>
      <!-- A chip that links to the owner -->

      <v-chip
        v-if="showOwner"
        small
        label
        :color="ownsIt ? 'orange' : 'green lighten-2'"
        class="my-1 mr-1"
        :href="frag.owner.viewUrl"
        target="_blank"
      >
        {{ ownsIt ? 'Yours' : frag.owner.name }}
        <v-icon small right>
          mdi-open-in-new
        </v-icon>
      </v-chip>

      <!-- A link to the thread that the item is tracked in -->

      <v-chip
        v-if="frag.threadUrl"
        small
        label
        color="#1f63a6"
        class="white--text my-1 mr-1"
        :href="frag.threadUrl"
        target="_blank"
      >
        Thread
        <v-icon small right>
          mdi-open-in-new
        </v-icon>
      </v-chip>

      <!-- A chip for the type -->

      <v-chip
        small
        label
        color="cyan lighten-3"
        class="my-1 mr-1"
        v-text="frag.type"
      />

      <!-- A chip for the age, if it has one -->

      <v-chip
        v-if="age"
        small
        label
        class="my-1 mr-1"
        v-text="age"
      />

      <!-- A chip for the collection it is in, only when we're not already showing a collection -->

      <v-chip
        v-if="!frag.inCollection"
        small
        label
        class="my-1 mr-1"
        v-text="frag.rules.toUpperCase()"
      />

      <!-- If the user is not the owner but has one of them, show it -->

      <v-chip
        v-if="frag.hasOne && !ownsIt && frag.inCollection"
        small
        label
        color="warning"
        class="my-1 mr-1"
      >
        You have it
      </v-chip>

      <!-- A chip that shows the user is a fan -->

      <v-chip
        v-if="isAFan"
        small
        label
        color="success"
        close
        class="my-1 mr-1"
        @click:close="removeFan"
      >
        You're a fan
      </v-chip>

      <!-- A chip to show the total number of available frags -->

      <v-chip
        v-if="fragsAvailable"
        small
        label
        class="my-1 mr-1"
        v-text="`${fragsAvailable} available`"
      />

      <!-- A chip that shows it is dead or has been transferred -->

      <v-chip
        v-if="!isAlive"
        small
        label
        color="error"
        class="my-1 mr-1"
      >
        {{ frag.status === 'transferred' ? 'Transferred' : 'RIP' }}
      </v-chip>
    </v-card-text>

    <v-btn
      small
      text
      class="ma-1"
      color="secondary"
      @click="showTabs = !showTabs"
    >
      {{ showTabs ? 'Less' : 'More' }}
      <v-icon>{{ showTabs ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </v-btn>

    <v-expand-transition>
      <div v-if="showTabs">
        <v-divider />
        <v-tabs
          v-model="tabs"
          center-active
          show-arrows
        >
          <slot name="first-tabs" />
          <v-tab>
            <v-icon>mdi-wall-sconce-flat</v-icon>
          </v-tab>
          <v-tab v-if="notes">
            <v-icon>mdi-text</v-icon>
          </v-tab>
          <v-tab v-if="shouldShowLineage" @click="updateLineage()">
            <v-icon>mdi-file-tree-outline</v-icon>
          </v-tab>
          <v-tab v-if="canBecomeAFan || isAFan">
            <v-icon>mdi-thumb-up-outline</v-icon>
          </v-tab>
          <slot name="tabs" />
        </v-tabs>
        <v-tabs-items v-model="tabs">
          <slot name="first-tabs-items" />

          <!-- A table to show light, flow, hardiness and growth rate -->

          <v-tab-item>
            <v-card-title>Conditions and traits</v-card-title>
            <v-simple-table>
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
                      {{ frag.light.toLowerCase() }}
                    </td>
                    <td
                      class="text-center"
                    >
                      {{ frag.flow.toLowerCase() }}
                    </td>
                    <td
                      class="text-center"
                    >
                      {{ frag.hardiness.toLowerCase() }}
                    </td>
                    <td
                      class="text-center"
                    >
                      {{ frag.growthRate.toLowerCase() }}
                    </td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-tab-item>

          <!-- Notes -->

          <v-tab-item v-if="notes">
            <v-card-title>Notes</v-card-title>
            <v-card-text v-text="notes" />
          </v-tab-item>

          <!-- Lineage -->

          <v-tab-item v-if="shouldShowLineage">
            <v-card-title>Lineage</v-card-title>
            <div
              v-if="lineage.length === 0"
              class="text-center"
            >
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
                    v-if="item.isSource"
                    size="23"
                    color="amber"
                  />
                  <v-avatar
                    v-else-if="item.original"
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
                  <strong v-if="item.isAlive" v-text="user.id === item.owner.id ? 'You' : item.owner.name" />
                  <span v-else class="text-decoration-line-through" v-text="user.id === item.owner.id ? 'You' : item.owner.name" />
                </template>
              </v-treeview>
            </div>
          </v-tab-item>

          <!-- Fan/Like -->
          <v-tab-item v-if="canBecomeAFan || isAFan">
            <v-card-title>Like</v-card-title>
            <div v-if="canBecomeAFan">
              <v-card-text>Like this item to be notified when frags are available</v-card-text>
              <v-card-text>
                <v-btn
                  small
                  color="secondary"
                  :loading="loadingFan"
                  @click="becomeAFan"
                >
                  Like
                </v-btn>
              </v-card-text>
            </div>
            <div v-else>
              <v-card-text>You already like this item. Unlike if you'd like to stop receiving notifications</v-card-text>
              <v-card-text>
                <v-btn
                  small
                  color="secondary"
                  :loading="loadingFan"
                  @click="removeFan"
                >
                  Unlike
                </v-btn>
              </v-card-text>
            </div>
          </v-tab-item>

          <slot name="tabs-items" />
        </v-tabs-items>
      </div>
    </v-expand-transition>

    <!-- Slot for content -->

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
    showOwner: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    lineage: [],
    gotLineage: false,

    shareAlert: false,
    shareLink: undefined,

    showTabs: false,
    // Tabs
    tabs: null,
    // Loading indicator for the 'become a fan' button
    loadingFan: false
  }),
  computed: {
    frag () {
      return this.fragOrMother
    },
    notes () {
      return this.frag.notes
    },
    shouldShowLineage () {
      return !(this.isPrivate || this.frag.isStatic)
    },
    isAlive () {
      return this.frag.isAlive
    },
    isPrivate () {
      return this.frag.rules === 'private'
    },
    fragsAvailable () {
      const thing = this.frag
      if (thing.rules === 'private') {
        return 0
      }
      return thing.fragsAvailable + (thing.otherFragsAvailable || 0)
    },
    ownsIt () {
      return this.frag.ownsIt
    },
    age () {
      return this.isAlive ? age(this.frag.dateAcquired, '', 'old') : null
    },
    showEdit () {
      return this.ownsIt && this.isAlive
    },
    isAFan () {
      return this.frag.isFan
    },
    canBecomeAFan () {
      return !this.frag.isStatic && !this.isAFan && !this.ownsIt && !this.fragsAvailable
    }
  },
  watch: {
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
        const { root } = await this.$axios.$get(`/bc/api/dbtc/tree/${this.frag.motherId}`)
        addAge(root)
        root.original = true
        if (this.frag.source) {
          this.lineage = [{
            fragId: 'source',
            text: '',
            owner: {
              name: this.frag.source
            },
            isAlive: true,
            isSource: true,
            children: [root]
          }]
        } else {
          this.lineage = [root]
        }
        this.gotLineage = true
      })
    },
    async becomeAFan () {
      this.loadingFan = true
      try {
        await this.$axios.$put(`/bc/api/dbtc/fan/${this.frag.motherId}`)
        this.frag.isFan = true
      } finally {
        this.loadingFan = false
      }
    },
    async removeFan () {
      this.loadingFan = true
      await this.$axios.$delete(`/bc/api/dbtc/fan/${this.frag.motherId}`)
      this.frag.isFan = false
      this.loadingFan = false
    },
    async getShareLink () {
      this.shareLink = undefined
      this.shareAlert = true
      const { url } = await this.$axios.$get(`/bc/api/dbtc/share/${this.frag.fragId}`)
      this.shareLink = url
    }
  }
}
</script>
