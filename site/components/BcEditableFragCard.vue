<template>
  <bc-frag-card
    v-if="frag"
    :frag-or-mother="frag"
    :user="user"
    :show-owner="showOwner"
    :market="market"
    @update:tab="tabChanged($event)"
  >
    <template v-slot:first-tabs>
      <slot name="first-tabs" />
    </template>
    <template v-slot:tabs>
      <!-- Make frags available -->
      <v-tab v-if="canMakeChanges && !isPrivate" href="#frag">
        <v-icon>mdi-hand-saw</v-icon>
      </v-tab>

      <!-- Give a frag -->
      <v-tab v-if="canMakeChanges && !isPrivate" href="#give">
        <v-icon>mdi-hand-heart-outline</v-icon>
      </v-tab>

      <!-- Add a journal entry -->
      <v-tab v-if="canMakeChanges" href="#entry">
        <v-icon>mdi-file-document-edit-outline</v-icon>
      </v-tab>

      <!-- Journal -->
      <v-tab href="#journal">
        <v-icon>mdi-file-document-outline</v-icon>
      </v-tab>

      <!-- Pictures -->
      <v-tab href="#pictures">
        <v-icon>mdi-camera-outline</v-icon>
      </v-tab>

      <!-- RIP -->
      <v-tab v-if="canMakeChanges" href="#rip">
        <v-icon>mdi-emoticon-dead-outline</v-icon>
      </v-tab>
    </template>

    <template v-slot:first-tabs-items>
      <slot name="first-tabs-items" />
    </template>
    <template v-slot:tabs-items>
      <!-- Make frags available -->
      <v-tab-item v-if="canMakeChanges && !isPrivate" value="frag">
        <v-card-title>Update available frags</v-card-title>
        <v-card-text>
          You can change the number of available frags here. If you increase it,
          users that are interested will be notified. You can also decrease it
          if you no longer have all of those frags.
        </v-card-text>
        <validation-observer ref="fragsAvailableObserver" v-slot="{ invalid }">
          <v-form
            id="update-frags-available"
            @submit.prevent="submitPreventFragsAvailable"
            @submit="submitFragsAvailable"
          >
            <v-card-text>
              <validation-provider
                v-slot="{ errors }"
                rules="required|integer|min_value:0"
                name="frags available"
              >
                <v-text-field
                  id="fragsAvailable"
                  v-model="editedFragsAvailable"
                  label="Frags available"
                  name="fragsAvailable"
                  type="number"
                  min="0"
                  :error-messages="errors"
                  required
                  outlined
                  hide-details
                />
              </validation-provider>
            </v-card-text>
            <v-card-text>
              <v-btn
                small
                color="secondary"
                type="submit"
                :disabled="invalid || (editedFragsAvailable == fragsAvailable)"
                :loading="loadingMakeFragsAvailable"
                @click="loader = 'loading'"
              >
                Update
              </v-btn>
            </v-card-text>
          </v-form>
        </validation-observer>
      </v-tab-item>

      <!-- Give a frag -->
      <v-tab-item v-if="canMakeChanges && !isPrivate" value="give">
        <v-card-title>Give a frag or transfer this one</v-card-title>
        <validation-observer ref="giveAFragObserver" v-slot="{ invalid }">
          <v-form
            id="give-a-frag"
            @submit.prevent="submitPreventGiveAFrag"
            @submit="submitGiveAFrag"
          >
            <v-card-text>
              <v-checkbox
                v-model="isTransfer"
                label="Check this box if you are transferring this item and will no longer own it"
                hide-details
              />
            </v-card-text>
            <!-- The user that is getting the frag -->
            <v-card-text>
              <validation-provider
                rules="required"
                name="recipient"
              >
                <bc-user-autocomplete
                  v-model="recipient"
                  label="Recipient"
                  :exclude-user="user.id"
                />
              </validation-provider>
            </v-card-text>

            <!-- The date the user got the frag -->
            <v-card-text>
              <bc-date-picker
                v-model="dateGiven"
                label="Date given"
                name="date given"
                rules="required"
              />
            </v-card-text>

            <!-- An optional picture of the frag -->
            <v-card-text>
              <v-file-input
                v-model="picture"
                outlined
                label="Picture of the frag"
                accept="image/*"
                prepend-icon=""
                hide-details
              />
            </v-card-text>

            <!-- Notes about the frag -->
            <v-card-text>
              <v-textarea
                id="notes"
                v-model="notes"
                outlined
                label="Notes about the frag"
                auto-grow
                rows="2"
                hide-details
              />
            </v-card-text>

            <!-- The button to post it -->
            <v-card-text>
              <v-btn
                small
                color="secondary"
                type="submit"
                :disabled="invalid"
                :loading="loadingGiveAFrag"
                @click="loader = 'loading'"
              >
                Give
              </v-btn>
            </v-card-text>
          </v-form>
        </validation-observer>
      </v-tab-item>

      <!-- Add a journal entry -->
      <v-tab-item v-if="canMakeChanges" value="entry">
        <v-card-title>Add a journal entry</v-card-title>
        <v-form
          id="journal"
          @submit="submitJournal"
          @submit.prevent="submitPreventJournal"
        >
          <v-card-text>
            <v-btn-toggle
              v-model="journalType"
              mandatory
            >
              <v-btn value="update">
                <v-icon>mdi-progress-check</v-icon>
              </v-btn>
              <v-btn value="good">
                <v-icon>mdi-thumb-up-outline</v-icon>
              </v-btn>
              <v-btn value="bad">
                <v-icon>mdi-thumb-down-outline</v-icon>
              </v-btn>
            </v-btn-toggle>
          </v-card-text>

          <v-card-text>
            <v-file-input
              v-model="journalPicture"
              outlined
              label="Picture"
              accept="image/*"
              prepend-icon=""
              hide-details
            />
            <v-checkbox
              v-model="journalMakeCoverPicture"
              label="Make this the cover picture"
              :disabled="!journalPicture"
              hide-details
            />
          </v-card-text>
          <v-card-text>
            <v-textarea
              v-model="journalText"
              outlined
              label="How's it doing?"
              auto-grow
              rows="2"
              hide-details
            />
          </v-card-text>
          <v-card-text>
            <v-btn
              small
              color="secondary"
              type="submit"
              :disabled="!(journalPicture || journalText)"
              :loading="loadingJournal"
              @click="loader = 'loading'"
            >
              Submit
            </v-btn>
          </v-card-text>
        </v-form>
      </v-tab-item>

      <!-- Journal -->
      <v-tab-item value="journal">
        <v-card-title>
          Journal
        </v-card-title>
        <v-card-subtitle v-if="!isPrivate">
          <v-checkbox v-model="showCombinedJournals" label="Show combined journal" />
        </v-card-subtitle>
        <div v-if="showCombinedJournals">
          <v-card-text v-for="(j, index) in combinedJournals" :key="index">
            <v-row>
              <v-col cols="auto">
                <v-icon>
                  {{ j.icon }}
                </v-icon>
              </v-col>
              <v-col>
                <h3>{{ you(j.user.name) }}</h3>
                <v-img v-if="j.picture" :src="`/bc/uploads/${j.picture}`" aspect-ratio="1" />
                <div v-if="j.notes" v-text="j.notes" />
                <span class="caption" v-text="localeDateString(j.timestamp) + ' - ' + j.age" />
              </v-col>
            </v-row>
          </v-card-text>
        </div>
        <div v-else>
          <v-card-text v-for="j in loadedJournals || []" :key="j.journalId">
            <v-row>
              <v-col cols="auto">
                <v-icon>
                  {{ j.icon }}
                </v-icon>
              </v-col>
              <v-col>
                <div v-if="j.notes" v-text="j.notes" />
                <div
                  v-else
                >
                  Uploaded a picture
                </div>
                <span
                  class="caption"
                  v-text="j.date.toLocaleDateString() + ' - ' + j.age"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </div>
      </v-tab-item>

      <!-- Pictures -->
      <v-tab-item value="pictures">
        <v-card-title>Pictures</v-card-title>
        <v-card-subtitle v-if="!pictures.length">
          Add a journal entry with a picture to see it here.
        </v-card-subtitle>
        <v-card-text v-else>
          <v-row>
            <v-col
              v-for="(item, i) in pictures"
              :key="i"
              cols="12"
            >
              <v-img
                :src="`/bc/uploads/${item.picture}`"
                aspect-ratio="1"
              />
              <v-card-subtitle class="text-center">
                <div>{{ item.date }} - {{ item.text }}</div>
              </v-card-subtitle>
            </v-col>
          </v-row>
        </v-card-text>
      </v-tab-item>

      <!-- RIP -->
      <v-tab-item v-if="canMakeChanges" value="rip">
        <v-card-title>RIP</v-card-title>
        <v-card-text>
          They don't always make it and that's OK. If you mark the {{ frag.name }} as lost
          you won't be able to make any more changes to it.
        </v-card-text>
        <v-form
          @submit.prevent="submitPreventRIP"
          @submit="submitRIP"
        >
          <v-card-text>
            <v-textarea
              id="ripNotes"
              v-model="ripNotes"
              outlined
              label="What happened?"
              auto-grow
              rows="2"
              hide-details
            />
          </v-card-text>
          <v-card-text>
            <v-btn
              small
              color="secondary"
              type="submit"
              :loading="loadingRIP"
              @click="loader = 'loading'"
            >
              RIP
            </v-btn>
          </v-card-text>
        </v-form>
      </v-tab-item>
    </template>

    <!-- Temporary alert we show at the bottom when changes are made -->

    <v-snackbar v-model="snackbar" timeout="3000">
      {{ snackbarText }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">
          OK
        </v-btn>
      </template>
    </v-snackbar>
  </bc-frag-card>
</template>
<script>
import { ValidationObserver, ValidationProvider } from 'vee-validate/dist/vee-validate.full.esm'
import { age, utcIsoStringFromString, dateFromIsoString, differenceBetween, localeDateString } from '~/dates'
import BcUserAutocomplete from '~/components/BcUserAutocomplete.vue'
import BcDatePicker from '~/components/BcDatePicker.vue'
import BcFragCard from '~/components/BcFragCard.vue'

const ICONS = {
  good: 'mdi-thumb-up-outline',
  bad: 'mdi-thumb-down-outline',
  gave: 'mdi-hand-heart-outline',
  acquired: 'mdi-emoticon-happy-outline',
  fragged: 'mdi-hand-saw',
  rip: 'mdi-emoticon-dead-outline',
  changed: 'mdi-pencil-outline',
  imported: 'mdi-import'
}
const DEFAULT_ICON = 'mdi-progress-check'

function augment (journal) {
  // Parse the timestamp and and add a date
  journal.date = dateFromIsoString(journal.timestamp)
  // And a way to order them in reverse chronological
  journal.order = -journal.date.valueOf()
  // The age of the journal entry
  journal.age = age(journal.date, 'today', 'ago')
  // Icon
  journal.icon = ICONS[journal.entryType] || DEFAULT_ICON
  return journal
}

export default {
  components: {
    ValidationObserver,
    ValidationProvider,
    BcUserAutocomplete,
    BcDatePicker,
    BcFragCard
  },
  props: {
    frag: {
      type: Object,
      default: null
    },
    user: {
      type: Object,
      default: null
    },
    journals: {
      type: Array,
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
    editedFragsAvailable: undefined,
    // Whether we have tried to load journals
    loadedJournals: null,

    // The loading animation on the button
    loadingMakeFragsAvailable: false,

    loadingGiveAFrag: false,
    // Whether this is a transfer
    isTransfer: false,
    // The user object chosen as the recipient
    // in 'give a frag' {id,name}
    recipient: undefined,
    // The date chosen in give-a-frag
    dateGiven: undefined,
    // The picture of the given frag
    picture: undefined,
    // Notes about the frag
    notes: undefined,

    // For the journal
    journalPicture: undefined,
    journalText: undefined,
    journalType: 'update',
    loadingJournal: false,
    journalMakeCoverPicture: false,

    // For the combined journals
    showCombinedJournals: false,
    combinedJournals: undefined,

    // For RIP
    ripNotes: undefined,
    loadingRIP: false,

    // snackbar for changes
    snackbar: false,
    snackbarText: ''
  }),
  computed: {

    fragsAvailable: {
      get () {
        return this.frag.fragsAvailable
      },
      set (value) {
        this.frag.fragsAvailable = parseInt(value, 10)
      }
    },

    canMakeChanges () {
      return this.frag.ownsIt && this.frag.isAlive
    },

    hasAvailableFrags () {
      return this.frag.isAlive && this.fragsAvailable > 0
    },

    isPrivate () {
      return this.frag.rules === 'private'
    },

    pictures () {
      if (!this.loadedJournals) {
        return []
      }
      const result = this.loadedJournals
        .map(({ timestamp, picture }) => ({ timestamp, picture }))
        .filter(({ picture }) => picture)
        .reverse()

      result.reduce((lastTimestamp, item) => {
        item.date = dateFromIsoString(item.timestamp).toLocaleDateString()
        if (!lastTimestamp) {
          item.text = age(item.timestamp, 'today', 'ago')
          return item.timestamp
        }
        item.text = 'after ' + differenceBetween(lastTimestamp, item.timestamp)
        return lastTimestamp
      }, null)

      return result.reverse()
    }
  },
  watch: {
    journals (value) {
      if (value) {
        this.loadedJournals = value.map(journal => augment(journal))
      }
    },
    showCombinedJournals (value) {
      if (value && !this.combinedJournals) {
        this.combinedJournals = []
        this.loadCombinedJournals()
      }
    }
  },
  mounted () {
    this.editedFragsAvailable = this.fragsAvailable
    if (this.journals) {
      this.loadedJournals = this.journals.map(journal => augment(journal))
    }
  },
  methods: {
    tabChanged (tab) {
      switch (tab) {
        case 'journal':
        case 'pictures':
          this.loadJournals()
          break
      }
    },
    submitPreventFragsAvailable () {
      this.$refs.fragsAvailableObserver.validate()
    },

    async submitFragsAvailable () {
      this.loadingMakeFragsAvailable = true
      try {
        const { journal } = await this.$axios.$put(`/api/dbtc/frag/${this.frag.fragId}/available/${this.editedFragsAvailable}`)
        this.fragsAvailable = this.editedFragsAvailable
        this.addJournal(journal)
        this.snackbarText = `${this.fragsAvailable} made available`
        this.snackbar = true
      } finally {
        this.loadingMakeFragsAvailable = false
      }
    },

    submitPreventGiveAFrag () {
      this.$refs.giveAFragObserver.validate()
    },

    async submitGiveAFrag (event) {
      this.loadingGiveAFrag = true
      try {
        const recipientName = this.recipient.name
        const formData = new FormData()
        formData.set('motherId', this.frag.motherId)
        formData.set('fragOf', this.frag.fragId)
        formData.set('ownerId', this.recipient.id)
        // Convert the local date (only) to a full date/time with TZ information
        formData.set('dateAcquired', utcIsoStringFromString(this.dateGiven))
        if (this.picture) {
          formData.set('picture', this.picture)
        }
        if (this.notes) {
          formData.set('notes', this.notes)
        }
        const { isTransfer } = this
        if (isTransfer) {
          formData.set('transfer', true)
        }
        const { fragsAvailable, journal } = await this.$axios.$post('/api/dbtc/give-a-frag', formData)
        // Update available frags from the response
        this.fragsAvailable = fragsAvailable
        this.editedFragsAvailable = fragsAvailable
        // For a transfer, this frag is considered dead
        if (isTransfer) {
          this.frag.isAlive = false
          this.frag.status = 'transferred'
        }

        // Augment and add the journal
        this.addJournal(journal)
        // Clear the form because we're staying in the same page
        this.recipient = undefined
        this.picture = undefined
        this.notes = undefined
        this.dateGiven = undefined
        this.isTransfer = false
        event.target.reset()

        this.snackbarText = isTransfer ? `This frag was transferred to ${recipientName}` : `One frag given to ${recipientName}`
        this.snackbar = true
      } finally {
        this.loadingGiveAFrag = false
      }
    },

    submitPreventJournal () {
      // Do nothing, just here to keep the page from reloading
    },

    async submitJournal (event) {
      this.loadingJournal = true
      try {
        const formData = new FormData()
        formData.set('entryType', this.journalType)
        if (this.journalPicture) {
          formData.set('picture', this.journalPicture)
        }
        if (this.journalText) {
          formData.set('notes', this.journalText)
        }
        if (this.journalMakeCoverPicture) {
          formData.set('makeCoverPicture', true)
        }

        const { journal, coverPicture } = await this.$axios.$post(`/api/dbtc/frag/${this.frag.fragId}/journal`, formData)

        // Add it as the first one in our array
        this.addJournal(journal)

        // Update the cover picture for the frag
        if (coverPicture) {
          this.frag.picture = coverPicture
        }

        // Reset the form values
        this.journalPicture = ''
        this.journalType = 'update'
        this.journalText = ''
        this.journalMakeCoverPicture = false

        // Show the snack bar
        this.snackbarText = 'Journal entry added'
        this.snackbar = true
      } finally {
        this.loadingJournal = false
      }
    },

    submitPreventRIP () {
      // Do nothing
    },

    async submitRIP () {
      this.loadingRIP = true
      try {
        const formData = new FormData()
        if (this.ripNotes) {
          formData.set('notes', this.ripNotes)
        }
        const { journal } = await this.$axios.$post(`/api/dbtc/frag/${this.frag.fragId}/rip`, formData)
        this.addJournal(journal)
        this.frag.isAlive = false
        this.fragsAvailable = 0
        this.editedFragsAvailable = 0
        // Show the snack bar
        this.snackbarText = 'Sorry for your loss'
        this.snackbar = true
      } finally {
        this.loadingRIP = false
      }
    },

    addJournal (journal) {
      if (this.loadedJournals) {
        this.loadedJournals.unshift(augment(journal))
      }
      this.showCombinedJournals = false
      this.combinedJournals = undefined
    },

    async loadJournals () {
      if (!this.loadedJournals) {
        this.loadedJournals = []
        const { journals } = await this.$axios.$get(`/api/dbtc/journals/${this.frag.fragId}`)
        this.loadedJournals = journals.map(journal => augment(journal))
      }
    },

    localeDateString (value) {
      return localeDateString(value)
    },

    you (name) {
      if (name === this.user.name) {
        return 'You'
      }
      return name
    },

    async loadCombinedJournals () {
      const motherId = this.frag.motherId
      const url = `/api/dbtc/journals/kids/${encodeURIComponent(motherId)}`
      const { journals } = await this.$axios.$get(url)
      this.combinedJournals = journals
    }
  }
}
</script>
