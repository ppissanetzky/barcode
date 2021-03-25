<template>
  <v-card width="375px">
    <v-dialog
      v-model="oopsAlert"
      max-width="375px"
      persistent
    >
      <v-card>
        <v-card-title>{{ frag.name }}</v-card-title>
        <v-card-text>
          If there's something wrong with this item, describe the problem below and we'll get back to you.
        </v-card-text>
        <v-card-text>
          <v-textarea
            v-model="oopsNotes"
            rows="6"
            hide-details
            outlined
            full-width
          />
        </v-card-text>
        <v-card-text>
          <v-btn
            text
            @click="oopsAlert = false"
          >
            Cancel
          </v-btn>
          <v-btn
            text
            :disabled="!oopsNotes"
            @click="sendOops"
          >
            OK
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Picture or placeholder -->
    <v-img
      height="300px"
      :class="randomColor"
      :src="frag.picture ? `/bc/uploads/${frag.picture}` : `/bc/coral-placeholder.png`"
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
      <v-menu>
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
              text
              color="primary"
              :to="`/add-new-item?fragId=${frag.fragId}`"
            >
              <v-icon left>
                mdi-pencil
              </v-icon>
              Edit
            </v-btn>
          </v-list-item>
          <v-list-item v-if="showEdit">
            <v-btn
              text
              color="primary"
              @click="oopsAlert = true"
            >
              <v-icon left>
                mdi-alert-box-outline
              </v-icon>
              Oops
            </v-btn>
          </v-list-item>
          <v-list-item>
            <v-btn
              text
              color="primary"
              :to="`/frag/${frag.fragId}`"
            >
              <v-icon left>
                mdi-link
              </v-icon>
              Link
            </v-btn>
          </v-list-item>
          <v-list-item v-if="frag.fragOf">
            <v-btn
              text
              color="primary"
              @click="redirectToMother"
            >
              <v-icon left>
                mdi-mother-nurse
              </v-icon>
              Mother
            </v-btn>
          </v-list-item>
          <v-list-item v-if="ownsIt">
            <v-btn
              text
              color="primary"
              @click="getShareLink"
            >
              <v-icon left>
                mdi-export-variant
              </v-icon>
              Share
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
        :href="`/member/${frag.owner.id}`"
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
        color="brown"
        class="white--text my-1 mr-1"
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

      <!-- A chip that shows the user is in line for a frag -->

      <v-chip
        v-if="isAFan"
        small
        label
        color="success"
        close
        class="my-1 mr-1"
        @click:close="removeFan"
      >
        You've requested a frag
      </v-chip>

      <!-- A chip that shows how many people are in line -->

      <v-chip
        v-if="frag.fanCount && isAlive"
        small
        label
        color="deep-orange lighten-1"
        class="my-1 mr-1"
      >
        {{ frag.fanCount }} requested
      </v-chip>

      <!-- A chip to show the total number of available frags -->

      <v-chip
        v-if="fragsAvailable"
        small
        label
        color="yellow accent-4"
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
          v-model="tab"
          center-active
          show-arrows
        >
          <slot name="first-tabs" />
          <v-tab href="#conditions">
            <v-icon>mdi-wall-sconce-flat</v-icon>
          </v-tab>
          <v-tab v-if="notes" href="#notes">
            <v-icon>mdi-text</v-icon>
          </v-tab>
          <v-tab v-if="shouldShowLineage" href="#lineage">
            <v-icon>mdi-file-tree-outline</v-icon>
          </v-tab>
          <v-tab v-if="shouldShowKids" href="#kids">
            <v-icon>mdi-account-multiple-outline</v-icon>
          </v-tab>
          <v-tab v-if="!isPrivate" href="#like">
            <v-icon>mdi-chat-question-outline</v-icon>
          </v-tab>
          <slot name="tabs" />
        </v-tabs>
        <v-tabs-items v-model="tab">
          <slot name="first-tabs-items" />

          <!-- A table to show light, flow, hardiness and growth rate -->

          <v-tab-item value="conditions">
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

          <v-tab-item v-if="notes" value="notes">
            <v-card-title>Notes</v-card-title>
            <v-card-text v-text="notes" />
          </v-tab-item>

          <!-- Lineage -->

          <v-tab-item v-if="shouldShowLineage" value="lineage">
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
                  <strong v-if="item.isAlive" v-text="you(item.owner, true)" />
                  <span v-else class="text-decoration-line-through" v-text="you(item.owner, true)" />
                </template>
              </v-treeview>
            </div>
          </v-tab-item>

          <!-- Kids -->

          <v-tab-item v-if="shouldShowKids" value="kids">
            <v-card-title>Owners and frags available</v-card-title>
            <v-card-text v-if="!kids.length">
              Only <a :href="`/member/${user.id}`" target="_blank">{{ you(frag.owner) }}</a>
            </v-card-text>
            <v-card-text v-else>
              <v-simple-table dense>
                <tbody>
                  <tr
                    v-for="kid in kids"
                    :key="kid.fragId"
                  >
                    <td>
                      <a :href="`/member/${kid.owner.id}`" target="_blank">{{ you(kid.owner, true) }}</a>
                      {{ kid.owner.location ? ' in ' + kid.owner.location : '' }}
                    </td>
                    <td
                      class="text-right"
                    >
                      {{ kid.fragsAvailable }}
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card-text>
            <v-card-text v-if="kids.length > 1">
              <v-btn
                small
                color="secondary"
                :to="`/kids/${frag.motherId}`"
              >
                See all frags
              </v-btn>
            </v-card-text>
          </v-tab-item>

          <!-- Fan/Like -->
          <v-tab-item v-if="!isPrivate" value="like">
            <v-card-title v-if="likes === 0">
              No one has requested a frag
            </v-card-title>
            <div v-else>
              <v-card-title v-if="likes === 1">
                1 member has requested a frag
              </v-card-title>
              <v-card-title v-else>
                {{ likes }} members have requested a frag
              </v-card-title>
              <v-card-text>
                <v-simple-table dense>
                  <template v-slot:default>
                    <tbody>
                      <tr v-for="fan in fans" :key="fan.id">
                        <td>
                          <a :href="`/member/${fan.id}`" target="_blank">{{ you(fan, true) }}</a>
                          <span v-if="fan.location"> in {{ fan.location }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </template>
                </v-simple-table>
              </v-card-text>
            </div>
            <div v-if="isAFan">
              <v-card-text>
                <v-btn
                  small
                  color="secondary"
                  :loading="loadingFan"
                  @click="removeFan"
                >
                  Drop out
                </v-btn>
              </v-card-text>
            </div>
            <v-card-text v-else-if="canBecomeAFan">
              <p v-if="isDbtc">
                Have you read the <a href="https://bareefers.org/forum/threads/dbtc-info-rules.23030/" target="_blank">DBTC rules</a>?
              </p>
              <p>
                Do you understand that requesting a frag doesn't guarantee you'll get one and that this is not first-come, first-served?
              </p>
              <p>
                Do you have enough experience to keep this item and have a suitable home for it?
              </p>
              <v-checkbox
                v-model="getIt"
                label="Yes"
              />
              <v-btn
                small
                color="secondary"
                :disabled="!getIt"
                :loading="loadingFan"
                @click="becomeAFan"
              >
                Request a frag
              </v-btn>
            </v-card-text>
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
const COLORS = ['red', 'pink', 'purple',
  'indigo', 'blue', 'cyan', 'teal', 'green',
  'lime', 'orange', 'amber', 'brown'
]
function randomColor () {
  return COLORS[Math.floor(Math.random() * COLORS.length)] + ' lighten-5'
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
    showOwner: {
      type: Boolean,
      default: false
    },
    market: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    lineage: [],
    gotLineage: false,

    kids: [],
    gotKids: false,

    likes: 0,
    gotLikes: false,
    fans: [],

    shareAlert: false,
    shareLink: undefined,

    oopsAlert: false,
    oopsNotes: undefined,

    showTabs: false,
    tab: undefined,
    // Loading indicator for the 'become a fan' button
    loadingFan: false,
    getIt: false
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
    shouldShowKids () {
      return !(this.isPrivate || this.frag.isStatic)
    },
    shouldShowMarket () {
      return this.market &&
        this.ownsIt &&
        this.isPrivate &&
        this.isAlive &&
        !this.isStatic
    },
    isAlive () {
      return this.frag.isAlive
    },
    isDbtc () {
      return this.frag.rules === 'dbtc'
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
    isStatic () {
      return this.frag.isStatic
    },
    showEdit () {
      return this.ownsIt && this.isAlive && !this.isStatic
    },
    isAFan () {
      return this.frag.isFan
    },
    canBecomeAFan () {
      return !this.frag.isStatic && !this.ownsIt
    },
    randomColor
  },
  watch: {
    fragOrMother (value) {
      // Reset our data when the frag changes
      Object.assign(this.$data, this.$options.data())
    },
    fragsAvailable (value) {
      this.updateLineage(true)
      this.updateKids(true)
    },
    tab (tab) {
      this.$emit('update:tab', tab)
      switch (tab) {
        case 'lineage':
          this.updateLineage(false)
          break
        case 'kids':
          this.updateKids(false)
          break
        case 'like':
          this.updateLikes(false)
          break
      }
    }
  },
  mounted () {
    // If there is a '?tab=<tab>' show the tabs and focus it
    const { tab } = this.$route.query
    if (tab && !this.showTabs) {
      this.showTabs = true
      this.tab = tab
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
        const { root } = await this.$axios.$get(`/api/dbtc/tree/${this.frag.motherId}`)
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
    updateKids (force) {
      if (this.gotKids && !force) {
        return
      }
      this.$nextTick(async () => {
        const { frags } = await this.$axios.$get(`/api/dbtc/kids/${this.frag.motherId}`)
        this.kids = frags
          .filter(({ isAlive }) => isAlive)
          .sort((a, b) => b.fragsAvailable - a.fragsAvailable)
        this.gotKids = true
      })
    },
    updateLikes (force) {
      if (this.gotLikes && !force) {
        return
      }
      this.$axios.$get(`/api/dbtc/fan/${this.frag.motherId}`)
        .then(({ isFan, likes, users }) => {
          this.frag.isFan = isFan
          this.frag.fanCount = likes
          this.likes = likes
          this.fans = users
          this.gotLikes = true
        })
    },
    becomeAFan () {
      this.loadingFan = true
      this.$axios.$put(`/api/dbtc/fan/${this.frag.motherId}`)
        .then(({ isFan, likes, users }) => {
          this.frag.isFan = isFan
          this.frag.fanCount = likes
          this.likes = likes
          this.fans = users
          this.gotLikes = true
        })
        .finally(() => {
          this.loadingFan = false
        })
    },
    removeFan () {
      this.loadingFan = true
      this.$axios.$delete(`/api/dbtc/fan/${this.frag.motherId}`)
        .then(({ isFan, likes, users }) => {
          this.frag.isFan = isFan
          this.frag.fanCount = likes
          this.likes = likes
          this.fans = users
          this.gotLikes = true
        })
        .finally(() => {
          this.loadingFan = false
        })
    },
    async getShareLink () {
      this.shareLink = undefined
      this.shareAlert = true
      const { url } = await this.$axios.$get(`/api/dbtc/share/${this.frag.fragId}`)
      this.shareLink = url
    },
    sendOops () {
      const url = `/api/dbtc/oops/${this.frag.fragId}`
      const formData = new FormData()
      formData.set('notes', this.oopsNotes)
      this.$axios.$post(url, formData)
      this.oopsNotes = undefined
      this.oopsAlert = false
    },
    you (owner, caps) {
      if (owner.id === this.user.id) {
        return caps ? 'You' : 'you'
      }
      return owner.name
    },
    async redirectToMother () {
      const url = `/api/dbtc/mother/${this.frag.motherId}`
      const { frag } = await this.$axios.$get(url)
      this.$router.push(`/frag/${frag.fragId}`)
    }
  }
}
</script>
