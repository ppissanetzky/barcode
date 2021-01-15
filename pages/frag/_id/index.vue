<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <h1 v-if="frag" v-text="frag.name" />
      </v-col>
    </v-row>

    <!-- The card -->
    <v-row>
      <v-col cols="auto">
        <v-card v-if="frag" max-width="300">
          <v-img
            v-if="frag.picture"
            :src="`${$config.BC_UPLOADS_URL}/${frag.picture}`"
            max-width="300px"
            max-height="200px"
          />
          <v-img
            v-else
            max-width="300px"
            max-height="200px"
            src="/picture-placeholder.png"
          />
          <v-card-subtitle v-text="frag.scientificName" />
          <v-card-text>
            <v-chip label v-text="frag.type" />
            <v-chip v-if="frag.age" label v-text="frag.age" />
            <v-chip v-if="hasAvailableFrags" label v-text="`${fragsAvailable} available`" />
          </v-card-text>

          <!-- All the things that can be changed about this frag are wrapped in this div -->

          <div v-if="canMakeChanges">
            <!--
                A line item that expands to show a small form to make frags available
                only if the user owns this frag
            -->
            <div>
              <v-divider />
              <v-card-actions>
                <h3>Update available frags</h3>
                <v-spacer />
                <v-btn
                  icon
                  @click="showMakeFragsAvailable = !showMakeFragsAvailable"
                >
                  <v-icon>{{ showMakeFragsAvailable ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
              </v-card-actions>

              <v-expand-transition>
                <div v-show="showMakeFragsAvailable">
                  <v-divider />
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
                      <v-container>
                        <v-row>
                          <v-col cols="auto">
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
                              />
                            </validation-provider>
                            <v-btn
                              color="secondary"
                              type="submit"
                              :disabled="invalid || fragsAvailable == editedFragsAvailable"
                              :loading="loadingMakeFragsAvailable"
                              @click="loader = 'loading'"
                            >
                              Update
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-form>
                  </validation-observer>
                </div>
              </v-expand-transition>
            </div>

            <!--
                A line item that expands to show a small form to give a frag to
                someone else
            -->
            <div>
              <v-divider />
              <v-card-actions>
                <h3>Give a frag</h3>
                <v-spacer />
                <v-btn
                  icon
                  @click="showGiveAFrag = !showGiveAFrag"
                >
                  <v-icon>{{ showGiveAFrag ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
              </v-card-actions>

              <v-expand-transition>
                <div v-show="showGiveAFrag">
                  <v-divider />
                  <div v-if="!fragsAvailable">
                    <v-card-text>
                      You cannot give a frag because there are none available. Update
                      the number of available frags first.
                    </v-card-text>
                  </div>
                  <div v-else>
                    <validation-observer ref="giveAFragObserver" v-slot="{ invalid }">
                      <v-form
                        id="give-a-frag"
                        @submit.prevent="submitPreventGiveAFrag"
                        @submit="submitGiveAFrag"
                      >
                        <v-container>
                          <!-- The user that is getting the frag -->
                          <v-row>
                            <v-col>
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
                            </v-col>
                          </v-row>

                          <!-- The date the user got the frag -->
                          <v-row>
                            <v-col>
                              <bc-date-picker
                                v-model="dateGiven"
                                label="Date given"
                                name="date given"
                                rules="required"
                              />
                            </v-col>
                          </v-row>

                          <!-- An optional picture of the frag -->
                          <v-row>
                            <v-col>
                              <v-file-input
                                v-model="picture"
                                outlined
                                label="Picture of the frag"
                                accept="image/*"
                                prepend-icon=""
                              />
                            </v-col>
                          </v-row>

                          <!-- Notes about the frag -->
                          <v-row>
                            <v-col>
                              <v-textarea
                                id="notes"
                                v-model="notes"
                                outlined
                                label="Notes about the frag"
                                auto-grow
                                rows="1"
                              />
                            </v-col>
                          </v-row>

                          <!-- The button to post it -->
                          <v-row>
                            <v-col>
                              <v-btn
                                color="secondary"
                                type="submit"
                                :disabled="invalid"
                                :loading="loadingGiveAFrag"
                                @click="loader = 'loading'"
                              >
                                Give
                              </v-btn>
                            </v-col>
                          </v-row>
                        </v-container>
                      </v-form>
                    </validation-observer>
                  </div>
                </div>
              </v-expand-transition>
            </div>

            <!-- A line item that expands to show a form to add a journal entry -->
            <div>
              <v-divider />
              <v-card-actions>
                <h3>Add a journal entry</h3>
                <v-spacer />
                <v-btn
                  icon
                  @click="showAddJournal = !showAddJournal"
                >
                  <v-icon>{{ showAddJournal ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
              </v-card-actions>
              <v-expand-transition>
                <div v-show="showAddJournal">
                  <v-divider />
                  <v-form
                    id="journal"
                    @submit="submitJournal"
                    @submit.prevent="submitPreventJournal"
                  >
                    <v-container>
                      <v-row>
                        <v-col>
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
                        </v-col>
                      </v-row>
                      <v-row>
                        <v-col>
                          <v-file-input
                            v-model="journalPicture"
                            outlined
                            label="Picture"
                            accept="image/*"
                            prepend-icon=""
                          />
                        </v-col>
                      </v-row>
                      <v-row>
                        <v-col>
                          <v-textarea
                            v-model="journalText"
                            outlined
                            label="Entry"
                            auto-grow
                            rows="2"
                          />
                        </v-col>
                      </v-row>
                      <v-row>
                        <v-col>
                          <v-spacer />
                          <v-btn
                            color="secondary"
                            type="submit"
                            :disabled="!(journalPicture || journalText)"
                            :loading="loadingJournal"
                            @click="loader = 'loading'"
                          >
                            Submit
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-container>
                  </v-form>
                </div>
              </v-expand-transition>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Another column and card to show journal information -->

      <v-col v-if="journals.length">
        <v-card>
          <v-card-title>Journal</v-card-title>
          <v-divider />
          <v-container>
            <v-data-iterator
              v-if="journals.length"
              :items="journals"
              item-key="journalId"
              :items-per-page="4"
              sort-by="order"
            >
              <template v-slot:default="{ items }">
                <v-row>
                  <v-col
                    v-for="j in items"
                    :key="j.journalId"
                  >
                    <v-card
                      max-width="300px"
                    >
                      <v-card-title>
                        {{ j.age }} ago
                        <v-spacer />
                        <v-icon
                          right
                        >
                          {{ j.icon }}
                        </v-icon>
                      </v-card-title>

                      <v-img
                        v-if="j.picture"
                        :src="`${$config.BC_UPLOADS_URL}/${j.picture}`"
                        max-width="300px"
                        max-height="200px"
                      />
                      <v-card-text v-text="j.notes" />
                    </v-card>
                  </v-col>
                </v-row>
              </template>
            </v-data-iterator>
          </v-container>
        </v-card>
      </v-col>
    </v-row>

    <!-- Temporary alert we show at the bottom when changes are made -->

    <v-snackbar v-model="snackbar" timeout="3000">
      {{ snackbarText }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">
          OK
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
<script>
// This imports the validation observer, provider and all the
// rules with their messages
import { formatISO, parseISO, formatDistanceToNow } from 'date-fns'
import { ValidationObserver, ValidationProvider } from 'vee-validate/dist/vee-validate.full.esm'
import BcUserAutocomplete from '~/components/BcUserAutocomplete.vue'
import BcDatePicker from '~/components/BcDatePicker.vue'

function augment (journal) {
  let { timestamp } = journal
  // Database timestamps are all in UTC, but sqlite doesn't
  // bother to add the 'Z' at the end, so add it now
  if (timestamp.length === 19) {
    timestamp += 'Z'
    journal.timestamp = timestamp
  }
  // Parse the timestamp and and add a date
  journal.date = parseISO(timestamp)
  // And a way to order them
  journal.order = -journal.date.valueOf()
  // Define a read only property for the human readable age
  Object.defineProperty(journal, 'age', {
    get () {
      return formatDistanceToNow(this.date)
    }
  })
  switch (journal.entryType) {
    case 'good': journal.icon = 'mdi-thumb-up-outline'; break
    case 'bad': journal.icon = 'mdi-thumb-down-outline'; break
    case 'gave': journal.icon = 'mdi-hand-heart-outline'; break
    case 'acquired': journal.icon = 'mdi-emoticon-happy-outline'; break
    default: journal.icon = 'mdi-progress-check'
  }
}

export default {
  components: {
    ValidationObserver,
    ValidationProvider,
    BcUserAutocomplete,
    BcDatePicker
  },
  async fetch () {
    const fragId = this.$route.params.id
    const { user, isOwner, frag, journals } = await this.$axios.$get(`/bc/api/dbtc/frag/${fragId}`)
    this.user = user
    this.isOwner = isOwner
    this.frag = frag
    journals.forEach(augment)
    this.journals = journals
    this.editedFragsAvailable = this.frag.fragsAvailable
  },
  data () {
    return {
      user: undefined,
      isOwner: false,
      frag: undefined,
      journals: [],

      // To show the panel to make frags
      showMakeFragsAvailable: false,
      // The loading animation on the button
      loadingMakeFragsAvailable: false,
      // The value from the frags available input
      editedFragsAvailable: undefined,

      showGiveAFrag: false,
      loadingGiveAFrag: false,
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
      showAddJournal: false,
      journalPicture: undefined,
      journalText: undefined,
      journalType: 'update',
      loadingJournal: false,

      // snackbar for changes
      snackbar: false,
      snackbarText: ''
    }
  },

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
      return this.isOwner && this.frag && this.frag.isAlive
    },

    hasAvailableFrags () {
      return this.frag.isAlive && this.fragsAvailable > 0
    },

    // If the user can make changes we will show a form
    // to add a journal entry. Or, if there are entries
    // we will show them
    shouldShowJournal () {
      return this.canMakeChanges || this.journals.length
    }
  },

  methods: {
    submitPreventFragsAvailable () {
      this.$refs.fragsAvailableObserver.validate()
    },

    async submitFragsAvailable () {
      this.loadingMakeFragsAvailable = true
      try {
        await this.$axios.$put(`/bc/api/dbtc/frag/${this.frag.fragId}/available/${this.editedFragsAvailable}`)
        this.fragsAvailable = this.editedFragsAvailable
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
        formData.set('dateAcquired', formatISO(parseISO(this.dateGiven)))
        formData.set('picture', this.picture)
        formData.set('notes', this.notes)
        const { fragsAvailable, journal } = await this.$axios.$post('/bc/api/dbtc/give-a-frag', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        // Update available frags from the response
        this.fragsAvailable = fragsAvailable
        this.editedFragsAvailable = fragsAvailable

        // Augment and add the journal
        augment(journal)
        this.journals.unshift(journal)
        // Clear the form because we're staying in the same page
        this.recipient = undefined
        this.picture = undefined
        this.notes = undefined
        this.dateGiven = undefined
        event.target.reset()

        this.snackbarText = `One frag given to ${recipientName}`
        this.snackbar = true
      } finally {
        this.loadingGiveAFrag = false
      }
      /*
      await this.$axios.$put(`/bc/api/dbtc/frag/${this.frag.fragId}/available/${this.fragsAvailable}`)
      // This will update the chip
      this.frag.fragsAvailable = this.fragsAvailable
      this.snackbarText = `${this.fragsAvailable} made available`
      this.snackbar = true
      */
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

        const { journal } = await this.$axios.$post(`/bc/api/dbtc/frag/${this.frag.fragId}/journal`, formData)

        augment(journal)
        // Add it as the first one in our array
        this.journals.unshift(journal)

        // Reset the form values
        this.journalPicture = ''
        this.journalType = 'update'
        this.journalText = ''

        // Show the snack bar
        this.snackbarText = 'Journal entry added'
        this.snackbar = true
      } finally {
        this.loadingJournal = false
      }
    }
  }
}
</script>
