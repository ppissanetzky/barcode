<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card
          v-if="!loadingCard"
          flat
        >
          <h1
            v-if="isUpdating"
            class="text-center"
            v-text="'Update ' + frag.name"
          />
          <h1
            v-else
            class="text-center"
          >
            Add a new item
          </h1>
        </v-card>
      </v-col>
    </v-row>

    <!-- The card with the form -->

    <v-row>
      <v-col>
        <v-card
          :loading="loadingCard"
        >
          <template slot="progress">
            <v-progress-linear indeterminate />
          </template>

          <!-- Watches over the form and disables the button if validation fails -->
          <validation-observer
            ref="observer"
            v-slot="{ invalid }"
          >
            <v-form
              id="add-new-item"
              @submit.prevent="submitPrevent"
              @submit="submit"
            >
              <v-container v-if="!loadingCard">
                <!-- Required information -->
                <v-row>
                  <v-col><h3>Required information</h3></v-col>
                </v-row>

                <!-- Name -->

                <v-row>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="name"
                    >
                      <v-text-field
                        id="name"
                        v-model="name"
                        label="Name"
                        name="name"
                        hint="Common name"
                        persistent-hint
                        :error-messages="errors"
                        required
                        outlined
                        :disabled="!canEditMother"
                      />
                    </validation-provider>
                  </v-col>

                  <!-- Type -->

                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="type"
                    >
                      <v-select
                        id="type"
                        v-model="type"
                        label="Type"
                        name="type"
                        :items="types"
                        item-value="type"
                        item-text="type"
                        :error-messages="errors"
                        required
                        outlined
                        :disabled="!canEditMother"
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <v-row>
                  <!-- Date acquired -->

                  <v-col>
                    <bc-date-picker
                      v-model="dateAcquired"
                      label="Date acquired"
                      name="date acquired"
                      hint="The date you got it"
                    />
                  </v-col>

                  <!-- Frags available -->

                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required|integer|min_value:0"
                      name="frags available"
                    >
                      <v-text-field
                        id="fragsAvailable"
                        v-model="fragsAvailable"
                        label="Frags available"
                        name="fragsAvailable"
                        hint="The number of frags available now"
                        persistent-hint
                        type="number"
                        min="0"
                        :error-messages="errors"
                        required
                        outlined
                        :disabled="isUpdating"
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <!-- Picture -->

                <v-row>
                  <v-col>
                    <v-text-field
                      v-if="isUpdating"
                      label="Picture"
                      hint="Add a journal entry to update the picture"
                      persistent-hint
                      outlined
                      disabled
                    />
                    <validation-provider
                      v-else
                      v-slot="{ errors, validate }"
                      rules="required|image"
                      name="picture"
                    >
                      <v-file-input
                        id="picture"
                        v-model="picture"
                        required
                        outlined
                        label="Picture"
                        name="picture"
                        accept="image/*"
                        prepend-icon=""
                        :error-messages="errors"
                        @change="validate"
                      />
                    </validation-provider>
                  </v-col>
                  <v-col>
                    <validation-provider
                      v-slot="{ errors }"
                      rules="required"
                      name="collection"
                    >
                      <v-select
                        id="type"
                        v-model="rules"
                        label="Collection"
                        name="collection"
                        :items="allRules"
                        item-value="rule"
                        item-text="description"
                        :error-messages="errors"
                        required
                        outlined
                        :disabled="isUpdating"
                      />
                    </validation-provider>
                  </v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <v-divider />
                    <v-card-actions>
                      <h3>Additional details - optional</h3>
                      <v-spacer />
                      <v-btn
                        icon
                        @click="showAdditionalDetails = !showAdditionalDetails"
                      >
                        <v-icon>{{ showAdditionalDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-card-actions>

                    <v-expand-transition>
                      <v-container
                        v-show="showAdditionalDetails"
                        fluid
                      >
                        <!-- Size -->
                        <v-row v-if="canEditMother">
                          <v-col>
                            <v-text-field
                              id="size"
                              v-model="size"
                              label="Size"
                              name="size"
                              hint="Polyps, heads or inches"
                              persistent-hint
                              outlined
                              :disabled="!canEditMother"
                            />
                          </v-col>
                        </v-row>

                        <!-- Scientific name -->

                        <v-row v-if="canEditMother">
                          <v-col>
                            <v-text-field
                              id="scientificName"
                              v-model="scientificName"
                              outlined
                              label="Scientific name"
                              name="scientificName"
                              :disabled="!canEditMother"
                            />
                          </v-col>
                        </v-row>

                        <!-- Notes -->

                        <v-row>
                          <v-col>
                            <v-textarea
                              id="notes"
                              v-model="notes"
                              outlined
                              label="Notes"
                              name="notes"
                              auto-grow
                              rows="1"
                            />
                          </v-col>
                        </v-row>

                        <!-- Light and flow -->

                        <v-row v-if="canEditMother">
                          <v-col>
                            <v-select
                              id="light"
                              v-model="light"
                              outlined
                              label="Light"
                              name="light"
                              :items="['Low','Medium','High']"
                              :disabled="!canEditMother"
                            />
                          </v-col>
                          <v-col>
                            <v-select
                              id="flow"
                              v-model="flow"
                              outlined
                              label="Flow"
                              name="flow"
                              :items="['Low','Medium','High']"
                              :disabled="!canEditMother"
                            />
                          </v-col>
                        </v-row>

                        <!-- Hardiness and growth rate -->

                        <v-row v-if="canEditMother">
                          <v-col>
                            <v-select
                              id="hardiness"
                              v-model="hardiness"
                              outlined
                              label="Hardiness"
                              name="hardiness"
                              :items="['Sensitive','Normal','Hardy']"
                              :disabled="!canEditMother"
                            />
                          </v-col>
                          <v-col>
                            <v-select
                              id="growthRate"
                              v-model="growthRate"
                              outlined
                              label="Growth rate"
                              name="growthRate"
                              :items="['Slow','Normal','Fast']"
                              :disabled="!canEditMother"
                            />
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-expand-transition>
                  </v-col>
                </v-row>

                <!-- Source -->

                <v-row v-if="canEditMother">
                  <v-col>
                    <v-divider />
                    <v-card-actions>
                      <h3>Source details - optional</h3>
                      <v-spacer />
                      <v-btn
                        icon
                        @click="showSourceDetails = !showSourceDetails"
                      >
                        <v-icon>{{ showSourceDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-card-actions>

                    <v-expand-transition>
                      <v-container
                        v-show="showSourceDetails"
                        fluid
                      >
                        <!-- Source type and name -->

                        <v-row>
                          <v-col>
                            <v-select
                              id="sourceType"
                              v-model="sourceType"
                              outlined
                              label="Source type"
                              name="sourceType"
                              :items="['Member','LFS','Online', 'Other']"
                              hint="Where you got it"
                              persistent-hint
                              :disabled="!canEditMother"
                            />
                          </v-col>
                          <v-col>
                            <v-text-field
                              id="source"
                              v-model="source"
                              outlined
                              label="Source name"
                              name="source"
                              :disabled="!canEditMother"
                            />
                          </v-col>
                        </v-row>

                        <!-- Cost -->

                        <v-row>
                          <v-col>
                            <v-text-field
                              id="cost"
                              v-model="cost"
                              outlined
                              label="Cost"
                              name="cost"
                              hint="How much you paid for it"
                              persistent-hint
                              :disabled="!canEditMother"
                            />
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-expand-transition>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-divider />
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      color="primary"
                      type="submit"
                      :disabled="invalid || loading"
                      :loading="loading"
                      @click="loader = 'loading'"
                    >
                      {{ isUpdating ? 'Update' : 'Add it now' }}
                    </v-btn>
                  </v-col>
                </v-row>
              </v-container>
            </v-form>
          </validation-observer>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
// This imports the validation observer, provider and all the
// rules with their messages
import { ValidationObserver, ValidationProvider } from 'vee-validate/dist/vee-validate.full.esm'
import { utcIsoStringFromString } from '~/dates'
import BcDatePicker from '~/components/BcDatePicker.vue'

function undefinedIfNull (value) {
  return value === null ? undefined : value
}

export default {
  components: {
    ValidationObserver,
    ValidationProvider,
    BcDatePicker
  },
  async fetch () {
    this.loadingCard = true
    try {
      const { types, rules } = await this.$axios.$get('/bc/api/dbtc/enums')
      this.types = types
      this.allRules = rules

      // If a frag ID is passed in, we are editing an existing item
      const { fragId } = this.$route.query
      if (fragId) {
        const { frag } = await this.$axios.$get(`/bc/api/dbtc/frag/${fragId}`)
        this.frag = frag
        this.name = frag.name
        this.type = frag.type
        this.dateAcquired = frag.dateAcquired.substr(0, 10)
        this.fragsAvailable = frag.fragsAvailable
        this.size = undefinedIfNull(frag.size)
        this.scientificName = undefinedIfNull(frag.scientificName)
        this.notes = undefinedIfNull(frag.notes)
        this.light = undefinedIfNull(frag.light)
        this.flow = undefinedIfNull(frag.flow)
        this.hardiness = undefinedIfNull(frag.hardiness)
        this.growthRate = undefinedIfNull(frag.growthRate)
        this.sourceType = undefinedIfNull(frag.sourceType)
        this.source = undefinedIfNull(frag.source)
        this.cost = undefinedIfNull(frag.cost)
        this.rules = frag.rules
      }
    } finally {
      this.loadingCard = false
    }
  },
  data () {
    return {
      // When we are editing, this is the original data
      frag: undefined,

      // This is what we're editing
      name: undefined,
      type: undefined,
      dateAcquired: undefined,
      fragsAvailable: 0,
      picture: undefined,
      size: undefined,
      scientificName: undefined,
      notes: undefined,
      light: 'Medium',
      flow: 'Medium',
      hardiness: 'Normal',
      growthRate: 'Normal',
      sourceType: 'Other',
      source: undefined,
      cost: 0,
      rules: 'dbtc',

      // Enums
      types: [],
      allRules: [],

      // For the main card
      loadingCard: true,

      // For the loading animation on the add it now button
      loading: false,

      // For the drop-down sections
      showAdditionalDetails: false,
      showSourceDetails: false
    }
  },
  computed: {
    isUpdating () {
      return !!this.frag
    },
    canEditMother () {
      // Can only edit 'mother' fields when adding a new item
      // or updating a frag that doesn't have a parent frag
      return !this.frag || (this.frag && !this.frag.fragOf)
    }
  },
  methods: {
    submitPrevent () {
      this.$refs.observer.validate()
    },

    async submit () {
      this.loading = true
      try {
        const formData = new FormData()
        const keys = [
          'name',
          'type',
          // 'dateAcquired', - added below
          'fragsAvailable',
          'picture',
          'size',
          'scientificName',
          'notes',
          'light',
          'flow',
          'hardiness',
          'growthRate',
          'sourceType',
          'source',
          'cost',
          'rules'
        ]

        keys.forEach((key) => {
          const value = this.$data[key]
          if (typeof value !== 'undefined') {
            formData.set(key, value)
          }
        })

        // Convert the local date (only) to a full date/time with TZ information
        formData.set('dateAcquired', utcIsoStringFromString(this.dateAcquired))

        let fragId
        if (this.isUpdating) {
          fragId = this.frag.fragId
          await this.$axios.$post(`/bc/api/dbtc/update/${fragId}`, formData)
        } else {
          const response = await this.$axios.$post('/bc/api/dbtc/add-new-item', formData)
          fragId = response.fragId
        }
        // Navigate to the details page for this frag, replacing
        // this page in the history, so that going back from the
        // details takes us back to the previous page and not this
        // one
        this.$router.replace(`/bc/frag/${fragId}`)
      } finally {
        // Turn off the loading button
        this.loading = false
      }
    }
  }
}
</script>
